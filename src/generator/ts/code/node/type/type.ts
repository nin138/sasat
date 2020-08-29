import { TypeReference } from './typeReference';
import { TypeLiteral } from './typeLiteral';
import { IntersectionType } from './intersectionType';
import { ArrayType } from './arrayType';
import { TsCode } from '../../abstruct/tsCode';
import { UnionType } from './unionType';
import { Identifier } from '../expressions';

export type TsType = TypeReference | TypeLiteral | IntersectionType | ArrayType | UnionType;

// @ts-ignore
export const isCode = (t: TsType): t is TsCode => t instanceof TsCode;
export const pickCode = (types: (TsType | Identifier)[]): TsCode[] =>
  types.filter(it => it instanceof TsCode) as TsCode[];
