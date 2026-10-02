import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config, setConfig } from "../../config/config.js";
import type { SQLClient } from "../../db/connectors/dbClient.js";
import { Direction, getCurrentMigration } from "./getCurrentMigration.js";
import { getMigrationFileNames } from "./getMigrationFiles.js";
import { getMigrationTargets } from "./getMigrationTarget.js";

let dir: string;
let original: ReturnType<typeof config>;
const names = ["001_create.ts", "002_alter.ts", "003_seed.ts"];
const options = {
  silent: true,
  dry: false,
  generateFiles: false,
  skipBuild: true,
};
beforeEach(() => {
  original = structuredClone(config());
  dir = mkdtempSync(join(tmpdir(), "sasat-migrations-"));
  jest.spyOn(process, "cwd").mockReturnValue(dir);
  setConfig({ migration: { dir: ".", target: undefined } });
  names.forEach((name) => writeFileSync(join(dir, name), ""));
});
afterEach(() => {
  Object.assign(config(), original);
  rmSync(dir, { recursive: true, force: true });
});

test("finds TypeScript migrations only", () => {
  writeFileSync(join(dir, "currentSchema.yml"), "");
  writeFileSync(join(dir, "001_create.mjs"), "");
  expect(getMigrationFileNames()).toEqual(names);
});

test("selects pending migrations or rolls back in reverse order", () => {
  expect(getMigrationTargets(names, undefined)).toEqual({
    direction: Direction.Up,
    files: names,
  });
  expect(getMigrationTargets(names, names[0])).toEqual({
    direction: Direction.Up,
    files: names.slice(1),
  });
  setConfig({ migration: { target: names[0] } });
  expect(getMigrationTargets(names, names[2])).toEqual({
    direction: Direction.Down,
    files: [names[2], names[1]],
  });
  expect(getMigrationTargets(names, names[0]).files).toEqual([]);
});

test("handles an empty migration directory", () => {
  expect(getMigrationTargets([], undefined)).toEqual({
    direction: Direction.Up,
    files: [],
  });
});

test("rejects unknown current and target migrations", () => {
  expect(() => getMigrationTargets(names, "missing.ts")).toThrow(
    "migration target not found",
  );
  setConfig({ migration: { target: "missing.ts" } });
  expect(() => getMigrationTargets(names, undefined)).toThrow(
    "migration target not found",
  );
});

function clientFor(history: { name: string; direction: string }[]) {
  return {
    rawQuery: jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(history),
  } as unknown as SQLClient;
}

test("returns no current migration for an empty history", async () => {
  await expect(
    getCurrentMigration(clientFor([]), options),
  ).resolves.toBeUndefined();
});

test("reconstructs successful up/down history", async () => {
  await expect(
    getCurrentMigration(
      clientFor([
        { name: names[0], direction: "up" },
        { name: names[1], direction: "up" },
        { name: names[1], direction: "down" },
      ]),
      options,
    ),
  ).resolves.toBe(names[0]);
  await expect(
    getCurrentMigration(
      clientFor([
        { name: names[0], direction: "up" },
        { name: names[0], direction: "down" },
      ]),
      options,
    ),
  ).resolves.toBeUndefined();
});

test("rejects out-of-order migration history", async () => {
  await expect(
    getCurrentMigration(
      clientFor([{ name: names[1], direction: "up" }]),
      options,
    ),
  ).rejects.toThrow("Invalid migration order");
  await expect(
    getCurrentMigration(
      clientFor([
        { name: names[0], direction: "up" },
        { name: names[1], direction: "down" },
      ]),
      options,
    ),
  ).rejects.toThrow("Invalid migration history");
});

test("dry run reads history without submitting DDL", async () => {
  const rawQuery = jest
    .fn()
    .mockResolvedValue([{ name: names[0], direction: "up" }]);
  await expect(
    getCurrentMigration({ rawQuery } as unknown as SQLClient, {
      ...options,
      dry: true,
    }),
  ).resolves.toBe(names[0]);
  expect(rawQuery).toHaveBeenCalledTimes(1);
  expect(rawQuery.mock.calls[0][0]).toMatch(/^SELECT name, direction FROM/);
});

test("dry run treats a missing history table as an unapplied database", async () => {
  const rawQuery = jest
    .fn()
    .mockRejectedValue(
      Object.assign(new Error("missing table"), { code: "ER_NO_SUCH_TABLE" }),
    );
  await expect(
    getCurrentMigration({ rawQuery } as unknown as SQLClient, {
      ...options,
      dry: true,
    }),
  ).resolves.toBeUndefined();
  expect(rawQuery).toHaveBeenCalledTimes(1);
  expect(rawQuery.mock.calls[0][0]).toMatch(/^SELECT/);
});

test.each(["ER_ACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR", "ETIMEDOUT"])(
  "dry run propagates %s instead of assuming empty history",
  async (code) => {
    const error = Object.assign(new Error("unavailable"), { code });
    const rawQuery = jest.fn().mockRejectedValue(error);
    await expect(
      getCurrentMigration({ rawQuery } as unknown as SQLClient, {
        ...options,
        dry: true,
      }),
    ).rejects.toBe(error);
    expect(rawQuery.mock.calls[0][0]).toMatch(/^SELECT/);
  },
);
