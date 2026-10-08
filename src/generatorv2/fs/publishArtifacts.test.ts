import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishArtifacts } from "./publishArtifacts.js";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(join(tmpdir(), "sasat-publish-"));
});
afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});
function fixture() {
  const output = join(dir, "out");
  fs.mkdirSync(output);
  fs.writeFileSync(join(output, "entity.ts"), "old code");
  fs.writeFileSync(join(output, "obsolete.ts"), "obsolete");
  fs.writeFileSync(join(dir, "extension.ts"), "custom code");
  fs.writeFileSync(join(dir, "schema.yml"), "old schema");
  return [
    { path: output, files: [{ path: "entity.ts", content: "new code" }] },
    { path: join(dir, "extension.ts"), content: "custom code plus new export" },
    { path: join(dir, "schema.yml"), content: "new schema" },
    { path: join(dir, "sql.json"), content: "[]" },
  ];
}
function snapshot() {
  return Object.fromEntries(
    fs
      .readdirSync(dir, { recursive: true })
      .map(String)
      .sort()
      .map((name) => {
        const target = join(dir, name);
        const stat = fs.lstatSync(target);
        return [
          name,
          [
            stat.mode,
            stat.isDirectory() ? null : fs.readFileSync(target, "utf8"),
          ],
        ];
      }),
  );
}
test("publishes a complete set, removing obsolete output and preserving modes", () => {
  const artifacts = fixture();
  fs.chmodSync(join(dir, "out"), 0o750);
  fs.chmodSync(join(dir, "out/entity.ts"), 0o640);
  fs.chmodSync(join(dir, "extension.ts"), 0o600);
  publishArtifacts(artifacts);
  expect(fs.readFileSync(join(dir, "out/entity.ts"), "utf8")).toBe("new code");
  expect(fs.existsSync(join(dir, "out/obsolete.ts"))).toBe(false);
  expect(fs.readFileSync(join(dir, "schema.yml"), "utf8")).toBe("new schema");
  expect(fs.statSync(join(dir, "out")).mode & 0o777).toBe(0o750);
  expect(fs.statSync(join(dir, "out/entity.ts")).mode & 0o777).toBe(0o640);
  expect(fs.statSync(join(dir, "extension.ts")).mode & 0o777).toBe(0o600);
  expect(
    fs.readdirSync(dir).some((name) => name.startsWith(".sasat-codegen-")),
  ).toBe(false);
});
test("staging write failure leaves all existing files untouched", () => {
  const artifacts = fixture();
  const before = snapshot();
  const write = fs.writeFileSync;
  let calls = 0;
  jest.spyOn(fs, "writeFileSync").mockImplementation((...args) => {
    if (++calls === 3) throw new Error("disk full");
    return write(...args);
  });
  expect(() => publishArtifacts(artifacts)).toThrow("disk full");
  expect(snapshot()).toEqual(before);
});
test.each([1, 2, 3, 4, 5, 6, 7])(
  "restores the whole set after rename failure %s",
  (failAt) => {
    const artifacts = fixture();
    const before = snapshot();
    const rename = fs.renameSync;
    let calls = 0;
    jest.spyOn(fs, "renameSync").mockImplementation((...args) => {
      if (++calls === failAt) throw new Error("rename failed");
      return rename(...args);
    });
    expect(() => publishArtifacts(artifacts)).toThrow("rename failed");
    expect(snapshot()).toEqual(before);
  },
);
test("removes newly created files and directories after first-generation failure", () => {
  const rename = fs.renameSync;
  let calls = 0;
  jest.spyOn(fs, "renameSync").mockImplementation((...args) => {
    if (++calls === 2) throw new Error("rename failed");
    return rename(...args);
  });
  expect(() =>
    publishArtifacts([
      { path: join(dir, "new/deep/code.ts"), content: "code" },
      { path: join(dir, "new/schema.yml"), content: "schema" },
    ]),
  ).toThrow("rename failed");
  expect(fs.readdirSync(dir)).toEqual([]);
});
test("retains recovery files if restoring a backup also fails", () => {
  const artifacts = fixture();
  const rename = fs.renameSync;
  let calls = 0;
  jest.spyOn(fs, "renameSync").mockImplementation((...args) => {
    if (++calls === 4 || String(args[0]).endsWith("/previous"))
      throw new Error("storage unavailable");
    return rename(...args);
  });
  let failure: AggregateError | undefined;
  try {
    publishArtifacts(artifacts);
  } catch (error) {
    failure = error as AggregateError;
  }
  expect(failure).toBeInstanceOf(AggregateError);
  expect(
    failure!.errors.some((error) =>
      error.message.includes("recovery files retained at"),
    ),
  ).toBe(true);
  const backups = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(".sasat-codegen-"));
  expect(backups).toHaveLength(2);
  expect(
    backups.some((name) =>
      fs.existsSync(join(dir, name, "previous/obsolete.ts")),
    ),
  ).toBe(true);
});
test("rejects overlapping targets before modifying files", () => {
  const artifacts = fixture();
  const before = snapshot();
  expect(() =>
    publishArtifacts([
      ...artifacts,
      { path: join(dir, "out/nested.ts"), content: "nested" },
    ]),
  ).toThrow("Overlapping");
  expect(snapshot()).toEqual(before);
});
test("rejects symbolic-link targets without modifying their referents", () => {
  fs.writeFileSync(join(dir, "real"), "keep");
  fs.symlinkSync(join(dir, "real"), join(dir, "link"));
  expect(() =>
    publishArtifacts([{ path: join(dir, "link"), content: "replace" }]),
  ).toThrow("Unsupported");
  expect(fs.readFileSync(join(dir, "real"), "utf8")).toBe("keep");
  expect(fs.lstatSync(join(dir, "link")).isSymbolicLink()).toBe(true);
});
test("cleanup failure after commit reports the retained path without rolling back", () => {
  const artifacts = fixture();
  jest.spyOn(fs, "rmSync").mockImplementation(() => {
    throw new Error("cleanup failed");
  });
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  expect(() => publishArtifacts(artifacts)).not.toThrow();
  expect(fs.readFileSync(join(dir, "schema.yml"), "utf8")).toBe("new schema");
  expect(warn).toHaveBeenCalledWith(expect.stringContaining(".sasat-codegen-"));
});
