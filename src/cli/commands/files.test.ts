import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../../config/config.js";
import { Console } from "../console.js";
import { createMigration, createMigrationFile } from "./createMigration.js";

let dir: string;
let originalDir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "sasat-cli-"));
  originalDir = config().migration.dir;
  config().migration.dir = join(dir, "migrations");
  jest.spyOn(Console, "error").mockImplementation(() => {});
  jest.spyOn(Console, "success").mockImplementation(() => {});
});
afterEach(() => {
  config().migration.dir = originalDir;
  jest.useRealTimers();
  rmSync(dir, { recursive: true, force: true });
});

test("creates a timestamped migration with up and down hooks", () => {
  jest.useFakeTimers().setSystemTime(new Date(2024, 0, 2, 3, 4, 5));
  const name = createMigrationFile("createUsers");
  expect(name).toBe("20240102_030405createUsers");
  const content = readFileSync(
    join(config().migration.dir, name + ".ts"),
    "utf8",
  );
  expect(content).toContain(
    "export default class CreateUsers implements SasatMigration",
  );
  expect(content).toContain("up:");
  expect(content).toContain("down:");
});

test.each(["", "../escape", "invalid-name", "1invalid"])(
  "rejects invalid names %s before writing",
  (name) => {
    createMigration(name);
    expect(Console.error).toHaveBeenCalledTimes(1);
    expect(existsSync(config().migration.dir)).toBe(false);
  },
);

test("reports a successful migration creation", () => {
  createMigration("addUsers");
  expect(Console.success).toHaveBeenCalledWith(
    expect.stringContaining("Successfully created"),
  );
});
