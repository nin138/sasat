import {
  ConditionNode,
  ConditionValue,
  ContextConditionRangeValue,
} from '../generatorv2/nodes/ConditionNode.js';
import { ComparisonOperators } from '../db/sql/expression/comparison.js';

const parent = (field: string): ConditionValue => ({
  type: 'parent',
  field,
});

const child = (field: string): ConditionValue => ({
  type: 'child',
  field,
});

const contextOrError = (
  field: string,
  errorMessage: string,
): ConditionValue => ({
  type: 'context',
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
  type: 'context',
  field,
  onNotDefined: {
    action: 'defaultValue',
    value: defaultValue,
  },
});

const fixed = (value: string | number): ConditionValue => ({
  type: 'fixed',
  value,
});

const today = (thresholdHour?: number): ConditionValue => ({
  type: 'today',
  thresholdHour,
});

const now = (): ConditionValue => ({
  type: 'now',
});

const comparison = (
  left: ConditionValue,
  operator: ComparisonOperators,
  right: ConditionValue,
): ConditionNode => ({
  left,
  right,
  operator,
});

const between =
  () =>
  (left: ConditionValue, range: ContextConditionRangeValue): ConditionNode => ({
    left,
    operator: 'BETWEEN',
    right: range,
  });

const values = (
  begin: ConditionValue,
  end: ConditionValue,
): ContextConditionRangeValue => ({
  type: 'range',
  begin,
  end,
});

const betweenToday = (thresholdHour?: number): ContextConditionRangeValue => ({
  type: 'date-range',
  range: 'today',
  thresholdHour,
});

export const Conditions = {
  comparison,
  between,
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
