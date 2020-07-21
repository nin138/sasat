import { TypeReference } from './typeReference';
import { TypeLiteral } from './typeLiteral';
import { IntersectionType } from './intersectionType';

export type TsType = TypeReference | TypeLiteral | IntersectionType;
