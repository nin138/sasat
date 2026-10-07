import type Hashids from "hashids";

type NumberIdEncoder = {
  encode: (id: number) => string;
  decode: (id: string) => number;
};

export const makeNumberIdEncoder = (hashId: Hashids): NumberIdEncoder => {
  return {
    encode: (id: number) => hashId.encode(id),
    decode: (id: string) => hashId.decode(id)[0] as number,
  };
};

export const makeBigIntIdEncoder = (hashId: Hashids) => ({
  encode: (id: bigint): string => hashId.encode(id),
  decode: (id: string): bigint => {
    const decoded = hashId.decode(id);
    if (decoded.length !== 1) throw new Error("Invalid bigint hash ID");
    return BigInt(decoded[0]);
  },
});
