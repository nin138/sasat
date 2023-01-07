import { ComparisonOperators } from '../../db/sql/expression/comparison.js';

export type ConditionValue =
  | {
      type: 'parent' | 'child';
      field: string;
    }
  | ContextConditionValue
  | FixedConditionValue;

type ContextConditionValue = {
  type: 'context';
  field: string;
  onNotDefined: OnNotDefinedAction;
};

type FixedConditionValue = {
  type: 'fixed';
  value: string | number;
};

export type ContextConditionRangeValue =
  | {
      type: 'range';
      begin: ConditionValue;
      end: ConditionValue;
    }
  | DateRangeConditionValue;

type DateRangeConditionValue = {
  type: 'date';
  range: 'today';
  thresholdHour?: number;
};

type OnNotDefinedAction =
  | {
      action: 'error';
      message: string;
    }
  | {
      action: 'defaultValue';
      value: string | number;
    };

export type ConditionNode =
  | {
      left: ConditionValue;
      operator: ComparisonOperators;
      right: ConditionValue;
    }
  | {
      left: ConditionValue;
      operator: 'BETWEEN';
      right: ContextConditionRangeValue;
    };
