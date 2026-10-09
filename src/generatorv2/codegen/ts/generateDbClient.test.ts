import { isDeepStrictEqual } from "node:util";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { config, getDbConfig } from "../../../config/config.js";
import { generateDbClient } from "./generateDbClient.js";

const original = structuredClone(config());
afterEach(() => Object.assign(config(), structuredClone(original)));

function fixture(dialect: "mysql" | "postgres") {
  config().db.dialect = dialect;
  const source = generateDbClient();
  const create = jest.fn(
    (_options: object, _logger?: (sql: string) => void) => {
      let released = false;
      return {
        isReleased: () => released,
        release: jest.fn(async () => {
          released = true;
        }),
      };
    },
  );
  type Client = ReturnType<typeof create>;
  const exports = {} as {
    getDbClient: (options?: object, logger?: (sql: string) => void) => Client;
    releaseDbClient: () => Promise<void>;
  };
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  runInNewContext(code.outputText, {
    exports,
    require: (name: string) => {
      if (name === "node:util") return { isDeepStrictEqual };
      if (name === "sasat") return { getDbConfig };
      if (name === `sasat/${dialect}`)
        return dialect === "mysql"
          ? { createMysqlPoolClient: create }
          : { createPostgresClient: create };
      throw new Error(`Unexpected driver import: ${name}`);
    },
  });
  return { ...exports, create, source };
}

test.each(["mysql", "postgres"] as const)(
  "generated %s client is lazy, local to the output, and reads runtime settings",
  async (dialect) => {
    config().db.password = "generation-secret";
    const first = fixture(dialect);
    const second = fixture(dialect);
    expect(first.source).not.toContain("generation-secret");
    await first.releaseDbClient();
    expect(first.create).not.toHaveBeenCalled();
    config().db.password = "runtime-secret";
    const client = first.getDbClient();
    expect(first.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: "runtime-secret" }),
      undefined,
    );
    expect(first.create.mock.calls[0][0]).not.toHaveProperty("dialect");
    expect(first.getDbClient()).toBe(client);
    expect(first.create).toHaveBeenCalledTimes(1);
    expect(second.getDbClient()).not.toBe(client);
    await first.releaseDbClient();
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(first.getDbClient()).not.toBe(client);
    await first.releaseDbClient();
    await second.releaseDbClient();
  },
);

test.each(["mysql", "postgres"] as const)(
  "generated %s client rejects conflicting settings and mismatched dialects",
  async (dialect) => {
    const api = fixture(dialect);
    const logger = jest.fn();
    const options = dialect === "mysql" ? { connectionLimit: 4 } : { max: 4 };
    const client = api.getDbClient(options, logger);
    expect(api.getDbClient({ ...options }, logger)).toBe(client);
    expect(api.getDbClient()).toBe(client);
    expect(() => api.getDbClient({ ...options, port: 1 })).toThrow(
      "different settings",
    );
    expect(() => api.getDbClient(undefined, jest.fn())).toThrow(
      "different settings",
    );
    config().db.password = "changed-secret";
    expect(() => api.getDbClient()).toThrow("different settings");
    expect(() => api.getDbClient()).not.toThrow("changed-secret");
    await api.releaseDbClient();
    expect(api.getDbClient()).not.toBe(client);
    await api.releaseDbClient();
    config().db.dialect = dialect === "mysql" ? "postgres" : "mysql";
    expect(() => api.getDbClient()).toThrow("Regenerate code");
    expect(api.create).toHaveBeenCalledTimes(2);
  },
);

test("a failed factory can be retried and does not poison shared state", () => {
  const api = fixture("mysql");
  api.create.mockImplementationOnce(() => {
    throw new Error("creation failed");
  });
  expect(() => api.getDbClient()).toThrow("creation failed");
  expect(api.getDbClient().isReleased()).toBe(false);
  expect(api.create).toHaveBeenCalledTimes(2);
});
