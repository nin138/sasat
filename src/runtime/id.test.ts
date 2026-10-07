import Hashids from "hashids";
import { makeNumberIdEncoder } from "./id.js";

test.each([0, 1, 42, 2147483647])("round-trips numeric ID %i", (id) => {
  const encoder = makeNumberIdEncoder(new Hashids("test-salt"));
  const encoded = encoder.encode(id);
  expect(typeof encoded).toBe("string");
  expect(encoded.length).toBeGreaterThan(0);
  expect(encoder.decode(encoded)).toBe(id);
});

test("uses the supplied salt", () => {
  expect(makeNumberIdEncoder(new Hashids("one")).encode(42)).not.toBe(
    makeNumberIdEncoder(new Hashids("two")).encode(42),
  );
});

test("number encoders retain absence without confusing it with zero", () => {
  const encoder = makeNumberIdEncoder(new Hashids("test"));
  expect(encoder.encode(null)).toBeNull();
  expect(encoder.decode(null)).toBeNull();
  expect(encoder.encode(undefined)).toBeUndefined();
  expect(encoder.decode(undefined)).toBeUndefined();
  expect(encoder.decode(encoder.encode(0))).toBe(0);
});
