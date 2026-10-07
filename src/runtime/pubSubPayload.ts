// Non-JSON prefix separates this envelope from every legacy JSON payload.
const prefix = "sasat:bigint:v1:";

export function serializePubSubPayload(payload: unknown): string {
  const paths: string[][] = [];
  const parents = new WeakMap<object, string[]>();
  let root = true;
  const json = JSON.stringify(payload, function (key, value) {
    const path = root ? [] : [...parents.get(this)!, key];
    root = false;
    if (typeof value === "bigint") {
      paths.push(path);
      return String(value);
    }
    if (value !== null && typeof value === "object") parents.set(value, path);
    return value;
  });
  if (json === undefined)
    throw new Error("PubSub payload must be JSON serializable");
  return paths.length === 0
    ? json
    : prefix + JSON.stringify({ value: JSON.parse(json), paths });
}

export function parsePubSubPayload(message: string): unknown {
  if (!message.startsWith(prefix)) return JSON.parse(message);
  const envelope = JSON.parse(message.slice(prefix.length));
  if (!Array.isArray(envelope.paths)) throw new Error("Invalid bigint payload");
  for (const path of envelope.paths) {
    if (
      !Array.isArray(path) ||
      !path.every((key: unknown) => typeof key === "string")
    )
      throw new Error("Invalid bigint path");
    let owner = envelope;
    let key = "value";
    for (const segment of path) {
      owner = owner[key];
      key = segment;
      if (
        owner === null ||
        typeof owner !== "object" ||
        !Object.hasOwn(owner, key)
      )
        throw new Error("Invalid bigint path");
    }
    const value = owner[key];
    if (typeof value !== "string" || !/^-?\d+$/.test(value))
      throw new Error("Invalid bigint value");
    // defineProperty avoids invoking __proto__ setters on object payloads.
    Object.defineProperty(owner, key, {
      value: BigInt(value),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return envelope.value;
}
