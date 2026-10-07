import type { SasatConfig } from "./config.js";

type Schema = {
  optional?: boolean;
} & (
  | { kind: "object"; fields: Record<string, Schema> }
  | { kind: "string"; empty?: boolean; values?: readonly string[] }
  | { kind: "port" | "boolean" }
  | { kind: "array"; item: Schema }
);
const string: Schema = { kind: "string" };
const database: Schema = {
  kind: "object",
  fields: {
    dialect: { kind: "string", optional: true, values: ["mysql", "postgres"] },
    host: string,
    port: { kind: "port" },
    user: string,
    database: string,
    password: { kind: "string", optional: true, empty: true },
    ssl: {
      kind: "object",
      optional: true,
      fields: {
        ca: { kind: "array", optional: true, item: string },
      },
    },
  },
};
const schema: Schema = {
  kind: "object",
  fields: {
    db: database,
    testDB: { ...database, optional: true },
    migration: {
      kind: "object",
      fields: {
        table: string,
        dir: string,
        out: string,
        target: { ...string, optional: true },
        db: { ...database, optional: true },
      },
    },
    generator: {
      kind: "object",
      fields: {
        addJsExtToImportStatement: { kind: "boolean" },
        gql: { kind: "object", fields: { subscription: { kind: "boolean" } } },
      },
    },
  },
};

// Paths are assembled only from schema keys, never user keys or values.
export const invalidConfig = (key: string, reason: string): Error =>
  new Error(`Invalid configuration: ${key} ${reason}`);

function read(
  value: unknown,
  node: Schema,
  key: string,
  partial: boolean,
  environment: boolean,
): unknown {
  if (environment && typeof value === "string" && value.startsWith("$")) {
    const resolved = process.env[value.slice(1)];
    if (resolved === undefined)
      throw invalidConfig(key, "references an undefined environment variable");
    value = resolved;
  }
  if (value === undefined && node.optional) return undefined;
  if (node.kind === "object") {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== null &&
        Object.getPrototypeOf(Object.getPrototypeOf(value)) !== null)
    )
      throw invalidConfig(key, "must be an object");
    const result: Record<string, unknown> = {};
    for (const [name, item] of Object.entries(value)) {
      if (
        !Object.hasOwn(node.fields, name) &&
        name !== "__proto__" &&
        name !== "constructor"
      )
        result[name] = copyExtension(item, `${key}.*`, environment);
    }
    for (const [name, child] of Object.entries(node.fields)) {
      if (!Object.hasOwn(value, name)) {
        if (!partial && !child.optional)
          throw invalidConfig(
            key === "config" ? name : `${key}.${name}`,
            "is required",
          );
        continue;
      }
      result[name] = read(
        (value as Record<string, unknown>)[name],
        child,
        key === "config" ? name : `${key}.${name}`,
        partial,
        environment,
      );
    }
    return result;
  }
  if (node.kind === "array") {
    if (!Array.isArray(value)) throw invalidConfig(key, "must be an array");
    return Array.from(value, (item) =>
      read(item, node.item, `${key}[]`, partial, environment),
    );
  }
  if (node.kind === "string") {
    if (typeof value !== "string" || (!node.empty && value.trim().length === 0))
      throw invalidConfig(
        key,
        node.empty ? "must be a string" : "must be a non-empty string",
      );
    if (node.values && !node.values.includes(value))
      throw invalidConfig(key, `must be one of: ${node.values.join(", ")}`);
    return value;
  }
  if (node.kind === "boolean") {
    if (value === "true") return true;
    if (value === "false") return false;
    if (typeof value !== "boolean")
      throw invalidConfig(key, "must be a boolean (true or false)");
    return value;
  }
  if (typeof value === "string" && /^[0-9]+$/.test(value))
    value = Number(value);
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 65535
  )
    throw invalidConfig(key, "must be an integer between 1 and 65535");
  return value;
}

// Preserve existing driver/extension settings without claiming to validate their schema.
function copyExtension(
  value: unknown,
  key: string,
  environment: boolean,
  seen = new Set<object>(),
): unknown {
  if (environment && typeof value === "string" && value.startsWith("$")) {
    const resolved = process.env[value.slice(1)];
    if (resolved === undefined)
      throw invalidConfig(key, "references an undefined environment variable");
    return resolved;
  }
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value))
    throw invalidConfig(key, "must not contain cyclic values");
  seen.add(value);
  const result = Array.isArray(value)
    ? Array.from(value, (item) => copyExtension(item, key, environment, seen))
    : Object.fromEntries(
        Object.entries(value)
          .filter(([name]) => name !== "__proto__" && name !== "constructor")
          .map(([name, item]) => [
            name,
            copyExtension(item, key, environment, seen),
          ]),
      );
  seen.delete(value);
  return result;
}

function merge(base: unknown, update: unknown, appendArrays = true): unknown {
  if (Array.isArray(base) && Array.isArray(update))
    return appendArrays ? [...base, ...update] : [...update];
  if (
    base &&
    update &&
    typeof base === "object" &&
    typeof update === "object" &&
    !Array.isArray(base) &&
    !Array.isArray(update)
  ) {
    const result = { ...base } as Record<string, unknown>;
    for (const [key, value] of Object.entries(update))
      result[key] = merge(result[key], value, appendArrays);
    return result;
  }
  return update;
}

/** Normalize a detached candidate; callers publish it only after successful validation. */
export function mergeConfig(
  base: SasatConfig,
  update: unknown,
  environment = false,
): SasatConfig {
  const patch = read(update, schema, "config", true, environment);
  const candidate = merge(
    read(base, schema, "config", true, false),
    patch,
  ) as SasatConfig;
  // Optional connection overrides can be partial, but exposed configs are complete.
  if (candidate.testDB !== undefined)
    candidate.testDB = merge(
      candidate.db,
      candidate.testDB,
      false,
    ) as SasatConfig["db"];
  if (candidate.migration?.db !== undefined)
    candidate.migration.db = merge(
      candidate.db,
      candidate.migration.db,
      false,
    ) as SasatConfig["db"];
  const normalized = read(
    candidate,
    schema,
    "config",
    false,
    false,
  ) as SasatConfig;
  try {
    return structuredClone(normalized);
  } catch {
    throw invalidConfig("config", "must contain serializable values");
  }
}
