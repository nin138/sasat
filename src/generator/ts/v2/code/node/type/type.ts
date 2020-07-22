import { TypeReference } from './typeReference';
import { TypeLiteral } from './typeLiteral';
import { IntersectionType } from './intersectionType';
import { KeywordTypeNode } from './typeKeyword';
import { ArrayType } from './arrayType';

export type TsType =
  | KeywordTypeNode
  | TypeReference
  | TypeLiteral
  | IntersectionType
  | ArrayType;
