import { TypeReference } from './typeReference';
import { TypeLiteral } from './typeLiteral';
import { IntersectionType } from './intersectionType';
import { KeywordTypeNode } from './typeKeyword';
import { ArrayType } from './arrayType';
import { TsCode } from '../../abstruct/tsCode';
import { UnionType } from './unionType';
import { Identifier } from '../Identifier';

export type TsType = KeywordTypeNode | TypeReference | TypeLiteral | IntersectionType | ArrayType | UnionType;

// @ts-ignore
export const isCode = (t: TsType): t is TsCode => t instanceof TsCode;
export const pickCode = (types: (TsType | Identifier)[]): TsCode[] =>
  types.filter(it => it instanceof TsCode) as TsCode[];
