import Hashids from 'hashids';

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
