import { TypeReference } from './typeReference.js';

export const KeywordTypeNode = {
  any: new TypeReference('any'),
  unknown: new TypeReference('unknown'),
  number: new TypeReference('number'),
  bigInt: new TypeReference('BigInt'),
  boolean: new TypeReference('boolean'),
  string: new TypeReference('string'),
  symbol: new TypeReference('Symbol'),
  this: new TypeReference('this'),
  void: new TypeReference('void'),
  undefined: new TypeReference('undefined'),
  null: new TypeReference('null'),
  never: new TypeReference('never'),
};
