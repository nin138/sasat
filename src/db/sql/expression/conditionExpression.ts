import { createSqlGenerator, type SqlGenerator } from "../../sqlGenerator.js";
import {
  type ComparisonExpression,
  comparisonExpressionToSql,
} from "./comparison.js";
import { CompositeCondition } from "./compositeCondition.js";

export type ConditionExpression<T> =
  | ComparisonExpression<T>
  | CompositeCondition<T>;
export type WhereClause<T> =
  | ConditionExpression<T>
  | Array<ConditionExpression<T>>;

export const conditionExpressionToSql = (
  exp: WhereClause<unknown>,
  generator: SqlGenerator = createSqlGenerator(),
): string => {
  if (Array.isArray(exp)) {
    return CompositeCondition.and(exp).toSQL(generator);
  }

  if (exp instanceof CompositeCondition) return exp.toSQL(generator);
  return comparisonExpressionToSql(exp, generator);
};
