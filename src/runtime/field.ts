import type { AllowReadonly } from "@/runtime/types.js";
import type { BooleanValueExpression } from "./dsl/query/query.js";

export type Fields<Entity, Relation = Record<string, unknown>> = {
  fields: AllowReadonly<keyof Entity & string>[];
  relations?: Relation;
  tableAlias?: string;
  joinOn?: BooleanValueExpression;
  joinType?: "INNER" | "LEFT";
};
