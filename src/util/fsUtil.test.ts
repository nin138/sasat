import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyDir } from "../generatorv2/fs/emptyDir.js";
import {
  mkDirIfNotExist,
  readYmlFile,
  writeFileIfNotExist,
  writeYmlFile,
} from "./fsUtil.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "sasat-fs-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("creates nested directories idempotently", () => {
  const nested = join(dir, "one", "two");
  mkDirIfNotExist(nested);
  mkDirIfNotExist(nested);
  expect(existsSync(nested)).toBe(true);
});

test("writes new files and preserves user edits", async () => {
  const file = join(dir, "custom.ts");
  await writeFileIfNotExist(file, "original");
  await writeFileIfNotExist(file, "replacement");
  expect(readFileSync(file, "utf8")).toBe("original");
});

test("round-trips nested YAML and puts tableName first", () => {
  const value = { z: [1, 2], tableName: "users", a: { active: true } };
  writeYmlFile(join(dir, "schema"), "current.yml", value);
  const file = join(dir, "schema", "current.yml");
  expect(readYmlFile(file)).toEqual(value);
  expect(readFileSync(file, "utf8").startsWith("tableName: users")).toBe(true);
});

test("empties generated directories while preserving their parent", async () => {
  const generated = join(dir, "generated");
  await emptyDir(generated);
  mkDirIfNotExist(join(generated, "nested"));
  writeFileSync(join(generated, "nested", "old.ts"), "old");
  writeFileSync(join(dir, "custom.ts"), "keep");
  await emptyDir(generated);
  expect(readdirSync(generated)).toEqual([]);
  expect(readFileSync(join(dir, "custom.ts"), "utf8")).toBe("keep");
});
