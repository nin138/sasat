import { BooleanValueExpression } from './dsl/query/query.js';
import { MakeConditionArg } from './dsl/query/createQueryResolveInfo.js';

export type CustomCondition<Context> = (
  args: MakeConditionArg<Context>,
) => BooleanValueExpression;
