import { TypeReference } from './typeReference.js';
import { TypeLiteral } from './typeLiteral.js';
import { IntersectionType } from './intersectionType.js';
import { ArrayType } from './arrayType.js';
import { TsCode } from '../../abstruct/tsCode.js';
import { UnionType } from './unionType.js';
import { Identifier } from '../expressions.js';

export type TsType =
  | TypeReference
  | TypeLiteral
  | IntersectionType
  | ArrayType
  | UnionType;

export const isCode = (t: unknown): t is TsCode => t instanceof TsCode;

export const pickCode = (types: (TsType | Identifier | string)[]): TsCode[] =>
  types.filter(it => it instanceof TsCode) as TsCode[];
