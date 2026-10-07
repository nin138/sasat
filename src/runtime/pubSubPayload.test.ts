import { parsePubSubPayload, serializePubSubPayload } from "./pubSubPayload.js";

test.each([
  1n,
  -9223372036854775808n,
  {
    id: 9007199254740993n,
    amount: "1.2300",
    nested: [{ id: 1n }, null, 0n],
    version: "sasat:bigint:v1:",
  },
])("round trips bigint payload %p", (payload) => {
  expect(parsePubSubPayload(serializePubSubPayload(payload))).toEqual(payload);
});
test("keeps legacy JSON and user objects that look like markers unchanged", () => {
  const value = {
    $bigint: "1",
    value: "2",
    paths: [[]],
    text: "sasat:bigint:v1:",
    missing: undefined,
  };
  expect(serializePubSubPayload(value)).toBe(JSON.stringify(value));
  expect(parsePubSubPayload(serializePubSubPayload(value))).toEqual(
    JSON.parse(JSON.stringify(value)),
  );
});
test("supports repeated objects, toJSON, empty keys, and own __proto__ without prototype mutation", () => {
  const shared = { id: 1n };
  const value = {
    a: shared,
    b: shared,
    "": { "": 2n },
    date: new Date("2026-10-07T00:00:00Z"),
    unusual: JSON.parse('{"__proto__": {"id": "1"}}'),
  };
  Object.getOwnPropertyDescriptor(value.unusual, "__proto__")!.value.id = 3n;
  const result = parsePubSubPayload(serializePubSubPayload(value));
  expect(result).toEqual({ ...value, date: "2026-10-07T00:00:00.000Z" });
  expect(Object.prototype).not.toHaveProperty("id");
});
test.each([
  'sasat:bigint:v1:{"value":{},"paths":[["__proto__","polluted"]]}',
  'sasat:bigint:v1:{"value":"1.1","paths":[[]]}',
  "bad",
])("rejects malformed messages %s", (message) => {
  expect(() => parsePubSubPayload(message)).toThrow();
});
