import type { ComparisonOperators } from "../db/sql/expression/comparison.js";
import type { ConditionValue } from "../generatorv2/nodes/ConditionValues.js";
import type {
  JoinConditionNode,
  JoinConditionRangeValue,
  JoinConditionValue,
} from "../generatorv2/nodes/JoinConditionNode.js";
import type {
  QueryConditionNode,
  QueryConditionValue,
} from "../generatorv2/nodes/QueryConditionNode.js";

const parent = (field: string): JoinConditionValue => ({
  kind: "parent",
  field,
});

const child = (field: string): JoinConditionValue => ({
  kind: "child",
  field,
});

const contextOrError = (
  field: string,
  errorMessage: string,
): ConditionValue => ({
  kind: "context",
  field,
  onNotDefined: {
    action: "error",
    message: errorMessage,
  },
});

const contextOrDefault = (
  field: string,
  defaultValue: string | number,
): ConditionValue => ({
  kind: "context",
  field,
  onNotDefined: {
    action: "defaultValue",
    value: defaultValue,
  },
});

const fixed = (value: string | number): ConditionValue => ({
  kind: "fixed",
  value,
});

const today = (thresholdHour?: number, date?: boolean): ConditionValue => ({
  kind: "today",
  type: date ? "date" : "datetime",
  thresholdHour,
});

const now = (): ConditionValue => ({
  kind: "now",
});

const values = (
  begin: JoinConditionValue,
  end: JoinConditionValue,
): JoinConditionRangeValue => ({
  kind: "range",
  begin,
  end,
});

const betweenToday = (thresholdHour?: number): JoinConditionRangeValue => ({
  kind: "date-range",
  range: "today",
  thresholdHour,
});

const custom = (
  conditionName: string,
  parentRequiredFields?: string[],
  childRequiredFields?: string[],
): JoinConditionNode => ({
  kind: "custom",
  conditionName,
  parentRequiredFields,
  childRequiredFields,
});

const field = (column: string): QueryConditionValue => ({
  kind: "field",
  column,
});

const arg = (
  name: string,
  type: "Int" | "Float" | "String",
): QueryConditionValue => ({
  kind: "arg",
  name,
  type,
});

const betweenRel = (
  left: JoinConditionValue,
  range: JoinConditionRangeValue,
): JoinConditionNode => ({
  kind: "comparison",
  left,
  operator: "BETWEEN",
  right: range,
});

const betweenQuery = (
  left: QueryConditionValue,
  begin: QueryConditionValue,
  end: QueryConditionValue,
): QueryConditionNode => ({
  kind: "between",
  operator: "BETWEEN",
  left,
  begin,
  end,
});

const comparisonRel = (
  left: JoinConditionValue,
  operator: ComparisonOperators,
  right: JoinConditionValue,
): JoinConditionNode => ({
  kind: "comparison",
  left,
  right,
  operator,
});

const inRel = (
  left: JoinConditionValue,
  right: JoinConditionValue[],
): JoinConditionNode => ({
  kind: "comparison",
  left,
  right,
  operator: "IN",
});

const isNullRel = (value: JoinConditionValue): JoinConditionNode => ({
  kind: "isNull",
  value,
  not: false,
});

const isNotNullRel = (value: JoinConditionValue): JoinConditionNode => ({
  kind: "isNull",
  value,
  not: true,
});

const comparisonQuery = (
  left: QueryConditionValue,
  operator: ComparisonOperators,
  right: QueryConditionValue,
): QueryConditionNode => ({
  kind: "comparison",
  left,
  right,
  operator,
});

export const Conditions = {
  betweenRel,
  betweenQuery,
  custom,
  rel: {
    between: betweenRel,
    comparison: comparisonRel,
    in: inRel,
    isNull: isNullRel,
    isNotNull: isNotNullRel,
  },
  query: {
    between: betweenQuery,
    comparison: comparisonQuery,
  },
  value: {
    parent,
    child,
    contextOrError,
    contextOrDefault,
    fixed,
    today,
    now,
    field,
    arg,
  },
  range: {
    values,
    today: betweenToday,
  },
} as const;
