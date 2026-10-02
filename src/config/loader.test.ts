import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultConf } from "./config.js";
import { SasatConfigLoader } from "./loader.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "sasat-config-"));
  jest.spyOn(process, "cwd").mockReturnValue(dir);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.SASAT_TEST_HOST;
});

test("uses defaults when the config file is absent", () => {
  expect(new SasatConfigLoader().getConfig()).toEqual(defaultConf);
});

test("merges nested settings without losing defaults or mutating them", () => {
  const before = structuredClone(defaultConf);
  writeFileSync(
    join(dir, "sasat.yml"),
    "db:\n  host: example.test\ngenerator:\n  gql:\n    subscription: false\n",
  );
  expect(new SasatConfigLoader().getConfig()).toMatchObject({
    db: { host: "example.test", port: 3306, database: "sasat" },
    generator: {
      addJsExtToImportStatement: false,
      gql: { subscription: false },
    },
  });
  expect(defaultConf).toEqual(before);
});

test("resolves environment variables in nested values and arrays", () => {
  process.env.SASAT_TEST_HOST = "test-host";
  writeFileSync(
    join(dir, "sasat.yml"),
    "db:\n  host: $SASAT_TEST_HOST\n  ssl:\n    ca: [$SASAT_TEST_HOST]\n",
  );
  expect(new SasatConfigLoader().getConfig().db).toMatchObject({
    host: "test-host",
    ssl: { ca: ["test-host"] },
  });
});

test("reports malformed YAML", () => {
  writeFileSync(join(dir, "sasat.yml"), "db: [");
  expect(() => new SasatConfigLoader()).toThrow();
});
