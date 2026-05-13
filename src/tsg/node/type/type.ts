import { TsCode } from "../../abstruct/tsCode.js";
import type { Identifier } from "../expressions.js";
import type { ArrayType } from "./arrayType.js";
import type { IntersectionType } from "./intersectionType.js";
import type { TypeLiteral } from "./typeLiteral.js";
import type { TypeReference } from "./typeReference.js";
import type { UnionType } from "./unionType.js";

export type TsType =
  | TypeReference
  | TypeLiteral
  | IntersectionType
  | ArrayType
  | UnionType;

export const isCode = (t: unknown): t is TsCode => t instanceof TsCode;

export const pickCode = (types: (TsType | Identifier | string)[]): TsCode[] =>
  types.filter((it) => it instanceof TsCode) as TsCode[];
