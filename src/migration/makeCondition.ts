import {
  ConditionNode,
  ConditionValue,
  ContextConditionRangeValue,
} from '../generatorv2/nodes/ConditionNode.js';
import { ComparisonOperators } from '../db/sql/expression/comparison.js';

const parent = (field: string): ConditionValue => ({
  kind: 'parent',
  field,
});

const child = (field: string): ConditionValue => ({
  kind: 'child',
  field,
});

const contextOrError = (
  field: string,
  errorMessage: string,
): ConditionValue => ({
  kind: 'context',
  field,
  onNotDefined: {
    action: 'error',
    message: errorMessage,
  },
});

const contextOrDefault = (
  field: string,
  defaultValue: string | number,
): ConditionValue => ({
  kind: 'context',
  field,
  onNotDefined: {
    action: 'defaultValue',
    value: defaultValue,
  },
});

const fixed = (value: string | number): ConditionValue => ({
  kind: 'fixed',
  value,
});

const today = (thresholdHour?: number, date?: boolean): ConditionValue => ({
  kind: 'today',
  type: date ? 'date' : 'datetime',
  thresholdHour,
});

const now = (): ConditionValue => ({
  kind: 'now',
});

const comparison = (
  left: ConditionValue,
  operator: ComparisonOperators,
  right: ConditionValue,
): ConditionNode => ({
  kind: 'comparison',
  left,
  right,
  operator,
});

const between = (
  left: ConditionValue,
  range: ContextConditionRangeValue,
): ConditionNode => ({
  kind: 'comparison',
  left,
  operator: 'BETWEEN',
  right: range,
});

const values = (
  begin: ConditionValue,
  end: ConditionValue,
): ContextConditionRangeValue => ({
  kind: 'range',
  begin,
  end,
});

const betweenToday = (thresholdHour?: number): ContextConditionRangeValue => ({
  kind: 'date-range',
  range: 'today',
  thresholdHour,
});

const custom = (
  conditionName: string,
  parentRequiredFields?: string[],
  childRequiredFields?: string[],
): ConditionNode => ({
  kind: 'custom',
  conditionName,
  parentRequiredFields,
  childRequiredFields,
});

export const Conditions = {
  comparison,
  between,
  custom,
  value: {
    parent,
    child,
    contextOrError,
    contextOrDefault,
    fixed,
    today,
    now,
  },
  range: {
    values,
    today: betweenToday,
  },
} as const;
