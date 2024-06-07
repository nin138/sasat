import { ComparisonOperators } from '../../db/sql/expression/comparison.js';
import { ConditionValue } from './ConditionValues.js';

export type JoinConditionValue =
  | {
      kind: 'parent' | 'child';
      field: string;
    }
  | ConditionValue;

export type JoinConditionRangeValue =
  | {
      kind: 'range';
      begin: JoinConditionValue;
      end: JoinConditionValue;
    }
  | DateRangeConditionValue;

type DateRangeConditionValue = {
  kind: 'date-range';
  range: 'today';
  thresholdHour?: number;
};

export type JoinConditionNode =
  | {
      kind: 'comparison';
      left: JoinConditionValue;
      operator: ComparisonOperators;
      right: JoinConditionValue;
    }
  | {
      kind: 'comparison';
      left: JoinConditionValue;
      operator: 'BETWEEN';
      right: JoinConditionRangeValue;
    }
  | {
      kind: 'comparison';
      left: JoinConditionValue;
      operator: 'IN';
      right: JoinConditionValue[];
    }
  | JoinCustomConditionNode;

export type JoinCustomConditionNode = {
  kind: 'custom';
  conditionName: string;
  parentRequiredFields?: string[];
  childRequiredFields?: string[];
};
