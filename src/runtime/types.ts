import { MakeConditionArg } from './dsl/query/createQueryResolveInfo.js';
import { BooleanValueExpression } from './dsl/query/query.js';

export type CustomCondition<Context> = (
  args: MakeConditionArg<Context>,
) => BooleanValueExpression;
