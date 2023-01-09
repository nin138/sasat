import { ComparisonOperators } from '../../db/sql/expression/comparison.js';

export type ConditionValue =
  | {
      kind: 'parent' | 'child';
      field: string;
    }
  | ContextConditionValue
  | FixedConditionValue
  | TodayStartConditionValue
  | NowConditionValue;

type ContextConditionValue = {
  kind: 'context';
  field: string;
  onNotDefined: OnNotDefinedAction;
};

type FixedConditionValue = {
  kind: 'fixed';
  value: string | number;
};

type TodayStartConditionValue = {
  kind: 'today';
  type: 'date' | 'datetime';
  thresholdHour?: number;
};

type NowConditionValue = {
  kind: 'now';
};

export type ContextConditionRangeValue =
  | {
      kind: 'range';
      begin: ConditionValue;
      end: ConditionValue;
    }
  | DateRangeConditionValue;

type DateRangeConditionValue = {
  kind: 'date-range';
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
      kind: 'comparison';
      left: ConditionValue;
      operator: ComparisonOperators;
      right: ConditionValue;
    }
  | {
      kind: 'comparison';
      left: ConditionValue;
      operator: 'BETWEEN';
      right: ContextConditionRangeValue;
    }
  | CustomConditionNode;

export type CustomConditionNode = {
  kind: 'custom';
  conditionName: string;
  parentRequiredFields?: string[];
  childRequiredFields?: string[];
};
