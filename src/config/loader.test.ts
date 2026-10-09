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

test("normalizes environment ports/booleans without coercing passwords", () => {
  process.env.SASAT_TEST_HOST = "5432";
  writeFileSync(
    join(dir, "sasat.yml"),
    "db:\n  port: $SASAT_TEST_HOST\n  password: $SASAT_TEST_HOST\n",
  );
  expect(new SasatConfigLoader().getConfig().db).toMatchObject({
    port: 5432,
    password: "5432",
  });
  process.env.SASAT_TEST_HOST = "false";
  writeFileSync(
    join(dir, "sasat.yml"),
    "generator:\n  gql:\n    subscription: $SASAT_TEST_HOST\n",
  );
  expect(new SasatConfigLoader().getConfig().generator.gql.subscription).toBe(
    false,
  );
});

test.each(["host", "port", "password"])(
  "missing explicit environment references fail at db.%s",
  (key) => {
    delete process.env.SASAT_TEST_HOST;
    writeFileSync(join(dir, "sasat.yml"), `db:\n  ${key}: $SASAT_TEST_HOST\n`);
    expect(() => new SasatConfigLoader()).toThrow(
      `db.${key} references an undefined environment variable`,
    );
  },
);

test("optional missing settings and an empty password are allowed", () => {
  writeFileSync(join(dir, "sasat.yml"), 'db:\n  password: ""\n');
  expect(new SasatConfigLoader().getConfig().db.password).toBe("");
  expect(new SasatConfigLoader().getConfig().testDB).toBeUndefined();
});

test.each(["{}"])("empty configuration keeps defaults: %j", (yaml) => {
  writeFileSync(join(dir, "sasat.yml"), yaml);
  expect(new SasatConfigLoader().getConfig()).toEqual(defaultConf);
});

test.each([
  "",
  "# empty\n",
  "null",
  "[]",
  "true",
  "plain text",
  "db: []",
  "db: null",
  "generator: false",
  "migration: []",
])("rejects invalid YAML structure: %s", (yaml) => {
  writeFileSync(join(dir, "sasat.yml"), yaml);
  expect(() => new SasatConfigLoader()).toThrow("Invalid configuration:");
});

test("parser errors and invalid values never echo secrets or YAML snippets", () => {
  const secret = "S06_SYNTHETIC_SECRET";
  for (const yaml of [
    `db: [${secret}`,
    `db:\n  password: ${secret}\n  port: ${secret}`,
    `db:\n  ssl:\n    ca: [${secret}, null]`,
  ]) {
    writeFileSync(join(dir, "sasat.yml"), yaml);
    try {
      new SasatConfigLoader();
      throw new Error("validation did not run");
    } catch (error) {
      expect(String(error)).toContain("Invalid configuration:");
      expect(String(error)).not.toContain(secret);
      expect((error as Error).cause).toBeUndefined();
    }
  }
});

test("offline migration settings ignore connection and generation settings", () => {
  delete process.env.SASAT_TEST_HOST;
  writeFileSync(
    join(dir, "sasat.yml"),
    `
db:
  host: $SASAT_TEST_HOST
  port: invalid
  password: $SASAT_TEST_HOST
  ssl:
    ca: [$SASAT_TEST_HOST]
testDB: $SASAT_TEST_HOST
generator: $SASAT_TEST_HOST
application: $SASAT_TEST_HOST
migration:
  dir: definitions
  target: 001.ts
  out: $SASAT_TEST_HOST
  table: $SASAT_TEST_HOST
  db: $SASAT_TEST_HOST
`,
  );
  expect(SasatConfigLoader.getMigrationBuildConfig()).toEqual({
    dir: "definitions",
    target: "001.ts",
  });
  expect(() => new SasatConfigLoader()).toThrow("Invalid configuration:");
});

test("offline migration settings use defaults and resolve only their own environment references", () => {
  expect(SasatConfigLoader.getMigrationBuildConfig()).toEqual({
    dir: "migrations",
  });
  process.env.SASAT_TEST_HOST = "definitions";
  writeFileSync(
    join(dir, "sasat.yml"),
    "migration:\n  dir: $SASAT_TEST_HOST\n",
  );
  expect(SasatConfigLoader.getMigrationBuildConfig()).toEqual({
    dir: "definitions",
  });
});

test.each([
  ["migration:\n  dir: $SASAT_TEST_HOST", "migration.dir"],
  ["migration:\n  target: $SASAT_TEST_HOST", "migration.target"],
  ["migration:\n  dir: ''", "migration.dir"],
  ["migration:\n  target: 123", "migration.target"],
  ["migration: []", "migration"],
  ["[]", "config"],
  ["db: [SYNTHETIC_SECRET", "sasat.yml"],
])("offline build still validates required inputs: %s", (yaml, key) => {
  delete process.env.SASAT_TEST_HOST;
  writeFileSync(join(dir, "sasat.yml"), yaml);
  expect(() => SasatConfigLoader.getMigrationBuildConfig()).toThrow(
    `Invalid configuration: ${key}`,
  );
  expect(() => SasatConfigLoader.getMigrationBuildConfig()).not.toThrow(
    "SYNTHETIC_SECRET",
  );
});

test("offline reads do not publish partial configuration or weaken subsequent connection validation", async () => {
  delete process.env.SASAT_TEST_HOST;
  writeFileSync(
    join(dir, "sasat.yml"),
    "db:\n  host: $SASAT_TEST_HOST\nmigration:\n  dir: definitions\n",
  );
  await jest.isolateModulesAsync(async () => {
    const { getMigrationBuildConfig, getDbConfig, setConfig } = await import(
      "./config.js"
    );
    expect(getMigrationBuildConfig()).toEqual({ dir: "definitions" });
    expect(() => getDbConfig()).toThrow("db.host");
    process.env.SASAT_TEST_HOST = "localhost";
    expect(getDbConfig().host).toBe("localhost");
    setConfig({ migration: { dir: "configured", target: "002.ts" } });
    expect(getMigrationBuildConfig()).toEqual({
      dir: "configured",
      target: "002.ts",
    });
  });
});

test("scoped settings validate their own values without caching connection settings", async () => {
  delete process.env.SASAT_TEST_HOST;
  writeFileSync(
    join(dir, "sasat.yml"),
    `
db:
  dialect: mysql
  host: $SASAT_TEST_HOST
migration:
  dir: definitions
  out: output
  target: $SASAT_TEST_HOST
  db:
    dialect: postgres
    host: $SASAT_TEST_HOST
generator:
  gql:
    subscription: false
testDB: $SASAT_TEST_HOST
`,
  );
  await jest.isolateModulesAsync(async () => {
    const {
      getMigrationDirectory,
      getMigrationOutputDir,
      getGeneratorConfig,
      getConfiguredDialect,
      getDbConfig,
      getMigrationBuildConfig,
    } = await import("./config.js");
    expect(getMigrationDirectory()).toBe("definitions");
    expect(getMigrationOutputDir()).toBe("output");
    expect(getConfiguredDialect()).toBe("mysql");
    expect(getConfiguredDialect(true)).toBe("postgres");
    expect(getGeneratorConfig()).toEqual({
      addJsExtToImportStatement: false,
      gql: { subscription: false },
    });
    expect(() => getMigrationBuildConfig()).toThrow("migration.target");
    expect(() => getDbConfig()).toThrow("db.host");
  });
});

test.each([
  ["db:\n  dialect: invalid", ["db.dialect"], "db.dialect"],
  ["migration:\n  out: []", ["migration.out"], "migration.out"],
  [
    "generator:\n  gql:\n    subscription: invalid",
    ["generator"],
    "generator.gql.subscription",
  ],
  [
    "migration:\n  db:\n    dialect: $SASAT_TEST_HOST",
    ["migration.db.dialect"],
    "migration.db.dialect",
  ],
] as const)(
  "scoped validation rejects used invalid inputs: %s",
  (yaml, fields, key) => {
    delete process.env.SASAT_TEST_HOST;
    writeFileSync(join(dir, "sasat.yml"), yaml);
    expect(() => SasatConfigLoader.getFields(fields)).toThrow(key);
  },
);
