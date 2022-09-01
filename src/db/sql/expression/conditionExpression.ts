import {
  ComparisonExpression,
  comparisonExpressionToSql,
} from './comparison.js';
import { CompositeCondition } from './compositeCondition.js';

export type ConditionExpression<T> =
  | ComparisonExpression<T>
  | CompositeCondition<T>;
export type WhereClause<T> =
  | ConditionExpression<T>
  | Array<ConditionExpression<T>>;

export const conditionExpressionToSql = (exp: WhereClause<unknown>): string => {
  if (Array.isArray(exp)) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return CompositeCondition.and(exp).toSQL();
  }
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  if (exp instanceof CompositeCondition) return exp.toSQL();
  return comparisonExpressionToSql(exp);
};
