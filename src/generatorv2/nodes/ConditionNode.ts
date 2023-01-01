import { ComparisonOperators } from '../../db/sql/expression/comparison.js';

export type ConditionValue =
  | {
      type: 'parent' | 'child';
      field: string;
    }
  | ContextConditionValue;

type ContextConditionValue = {
  type: 'context';
  field: string;
  onNotDefined: OnNotDefinedAction;
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

export type ConditionNode = {
  left: ConditionValue;
  operator: ComparisonOperators;
  right: ConditionValue;
};
