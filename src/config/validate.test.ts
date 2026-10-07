import { config, defaultConf, setConfig } from "./config.js";
import { mergeConfig } from "./validate.js";

const withPort = (port: unknown) => mergeConfig(defaultConf, { db: { port } });
test.each([1, 65535, "5432", "00080"])("normalizes valid port %j", (port) => {
  expect(withPort(port).db.port).toBe(Number(port));
});
test.each([
  0,
  -1,
  65536,
  NaN,
  Infinity,
  1.5,
  "",
  " ",
  "abc",
  "1e3",
  "0x50",
  "+80",
  "80.0",
  true,
  null,
  undefined,
  {},
  [],
])("rejects invalid port %j", (port) => {
  expect(() => withPort(port)).toThrow(
    "db.port must be an integer between 1 and 65535",
  );
});
test.each(["host", "user", "database"])("validates db.%s", (key) => {
  for (const value of ["", " ", 0, false, null, undefined, [], {}])
    expect(() => mergeConfig(defaultConf, { db: { [key]: value } })).toThrow(
      `db.${key} must be a non-empty string`,
    );
});
test.each(["table", "dir", "out", "target"])(
  "validates migration.%s",
  (key) => {
    expect(() =>
      mergeConfig(defaultConf, { migration: { [key]: "" } }),
    ).toThrow(`migration.${key}`);
  },
);
test("validates optional fields, arrays and dialect values", () => {
  for (const [db, key] of [
    [{ dialect: "sqlite" }, "db.dialect"],
    [{ password: 123 }, "db.password"],
    [{ ssl: false }, "db.ssl"],
    [{ ssl: { ca: "pem" } }, "db.ssl.ca"],
    [{ ssl: { ca: [null] } }, "db.ssl.ca[]"],
  ] as const)
    expect(() => mergeConfig(defaultConf, { db })).toThrow(key);
  expect(
    mergeConfig(defaultConf, {
      db: { dialect: "postgres", password: undefined, ssl: { ca: [] } },
    }).db,
  ).toMatchObject({
    dialect: "postgres",
    password: undefined,
    ssl: { ca: [] },
  });
});
test.each([true, false, "true", "false"])("normalizes boolean %j", (value) => {
  expect(
    mergeConfig(defaultConf, {
      generator: {
        gql: { subscription: value },
        addJsExtToImportStatement: value,
      },
    }).generator,
  ).toEqual({
    gql: { subscription: value === true || value === "true" },
    addJsExtToImportStatement: value === true || value === "true",
  });
});
test.each([0, 1, "yes", "FALSE", "", null, undefined])(
  "rejects invalid boolean %j",
  (value) => {
    expect(() =>
      mergeConfig(defaultConf, { generator: { gql: { subscription: value } } }),
    ).toThrow("generator.gql.subscription");
  },
);
test("optional database blocks inherit main settings and validate their overrides", () => {
  const result = mergeConfig(defaultConf, {
    db: { dialect: "postgres", port: 5432, user: "app", ssl: { ca: ["ca"] } },
    migration: { db: { user: "migrator" } },
    testDB: { database: "test" },
  });
  expect(result.migration.db).toEqual({ ...result.db, user: "migrator" });
  expect(result.testDB).toEqual({ ...result.db, database: "test" });
  expect(mergeConfig(result, {})).toEqual(result);
  expect(() => mergeConfig(defaultConf, { testDB: { port: "bad" } })).toThrow(
    "testDB.port",
  );
  expect(() =>
    mergeConfig(defaultConf, { migration: { db: { host: "" } } }),
  ).toThrow("migration.db.host");
  expect(() => mergeConfig(defaultConf, { testDB: null })).toThrow(
    "testDB must be an object",
  );
});
test("preserves extension options, CA append semantics, and detached inputs", () => {
  const patch = { db: { connectionLimit: 8, ssl: { ca: ["one"] } } };
  const before = structuredClone(defaultConf);
  const initial = mergeConfig(defaultConf, patch);
  const next = mergeConfig(initial, { db: { ssl: { ca: ["two"] } } });
  expect(next.db).toMatchObject({
    connectionLimit: 8,
    ssl: { ca: ["one", "two"] },
  });
  expect(initial.db.ssl?.ca).toEqual(["one"]);
  patch.db.ssl.ca.push("external");
  expect(next.db.ssl?.ca).toEqual(["one", "two"]);
  expect(defaultConf).toEqual(before);
});
test("setConfig rejects atomically and publishes only valid detached updates", () => {
  const current = config();
  const before = structuredClone(current);
  try {
    expect(() =>
      setConfig({
        db: { host: "replacement", port: 0 },
        migration: { dir: "replacement" },
      }),
    ).toThrow("db.port");
    expect(config()).toBe(current);
    expect(current).toEqual(before);
    const patch = {
      db: { host: "replacement", password: "$LITERAL_PASSWORD" },
    };
    const next = setConfig(patch);
    expect(next.db.password).toBe("$LITERAL_PASSWORD");
    expect(next.db.port).toBe(before.db.port);
    expect(current).toEqual(before);
    patch.db.host = "mutated";
    expect(config().db.host).toBe("replacement");
    expect(
      setConfig({ migration: { target: undefined }, testDB: undefined })
        .migration.target,
    ).toBeUndefined();
  } finally {
    const live = config();
    for (const key of Object.keys(live))
      delete (live as unknown as Record<string, unknown>)[key];
    Object.assign(live, before);
  }
});
test("ignores prototype pollution keys and rejects cycles without exposing their content", () => {
  const result = mergeConfig(
    defaultConf,
    JSON.parse(
      '{"__proto__":{"polluted":true},"db":{"constructor":{"prototype":{"polluted":true}}}}',
    ),
  );
  expect(result).toEqual(defaultConf);
  expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
  const extension: Record<string, unknown> = {};
  extension.secret = extension;
  expect(() => mergeConfig(defaultConf, { extension })).toThrow(
    "config.* must not contain cyclic values",
  );
});
