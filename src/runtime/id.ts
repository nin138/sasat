import { GraphQLError } from "graphql";
import type Hashids from "hashids";

export interface HashIdEncoder<Value extends number | bigint> {
  encode(id: Value): string;
  encode(id: null): null;
  encode(id: undefined): undefined;
  encode(id: Value | null | undefined): string | null | undefined;
  decode(id: string): Value;
  decode(id: null): null;
  decode(id: undefined): undefined;
  decode(id: string | null | undefined): Value | null | undefined;
}

const invalidId = () =>
  new GraphQLError("Invalid Hash ID", {
    extensions: { code: "BAD_USER_INPUT" },
  });

function decodeOne(hashId: Hashids, id: string): number | bigint {
  try {
    if (typeof id !== "string" || id.length === 0) throw invalidId();
    const values = hashId.decode(id);
    if (values.length !== 1) throw invalidId();
    return values[0];
  } catch {
    // Do not expose the input, salt, alphabet or Hashids implementation errors.
    throw invalidId();
  }
}

export const makeNumberIdEncoder = (hashId: Hashids): HashIdEncoder<number> => {
  function encode(id: number): string;
  function encode(id: null): null;
  function encode(id: undefined): undefined;
  function encode(id: number | null | undefined): string | null | undefined;
  function encode(id: number | null | undefined): string | null | undefined {
    if (id == null) return id;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0)
      throw invalidId();
    return hashId.encode(id);
  }
  function decode(id: string): number;
  function decode(id: null): null;
  function decode(id: undefined): undefined;
  function decode(id: string | null | undefined): number | null | undefined;
  function decode(id: string | null | undefined): number | null | undefined {
    if (id == null) return id;
    const value = decodeOne(hashId, id);
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
      throw invalidId();
    return value;
  }
  return { encode, decode };
};

export const makeBigIntIdEncoder = (hashId: Hashids): HashIdEncoder<bigint> => {
  function encode(id: bigint): string;
  function encode(id: null): null;
  function encode(id: undefined): undefined;
  function encode(id: bigint | null | undefined): string | null | undefined;
  function encode(id: bigint | null | undefined): string | null | undefined {
    if (id == null) return id;
    if (typeof id !== "bigint" || id < 0n) throw invalidId();
    return hashId.encode(id);
  }
  function decode(id: string): bigint;
  function decode(id: null): null;
  function decode(id: undefined): undefined;
  function decode(id: string | null | undefined): bigint | null | undefined;
  function decode(id: string | null | undefined): bigint | null | undefined {
    if (id == null) return id;
    return BigInt(decodeOne(hashId, id));
  }
  return { encode, decode };
};
