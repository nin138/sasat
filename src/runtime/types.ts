import type { MakeConditionArg } from "./dsl/query/createQueryResolveInfo.js";
import type { BooleanValueExpression } from "./dsl/query/query.js";

export type CustomCondition<Context> = (
  args: MakeConditionArg<Context>,
) => BooleanValueExpression;

export type AllowReadonly<T> = T | Readonly<T>;
