import { TsCode } from '../../abstruct/tsCode.js';
import { Identifier } from '../expressions.js';
import { ArrayType } from './arrayType.js';
import { IntersectionType } from './intersectionType.js';
import { TypeLiteral } from './typeLiteral.js';
import { TypeReference } from './typeReference.js';
import { UnionType } from './unionType.js';

export type TsType =
  | TypeReference
  | TypeLiteral
  | IntersectionType
  | ArrayType
  | UnionType;

export const isCode = (t: unknown): t is TsCode => t instanceof TsCode;

export const pickCode = (types: (TsType | Identifier | string)[]): TsCode[] =>
  types.filter(it => it instanceof TsCode) as TsCode[];
