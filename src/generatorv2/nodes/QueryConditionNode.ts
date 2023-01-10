import { ConditionValue } from './ConditionValues.js';
import { ComparisonOperators } from '../../db/sql/expression/comparison.js';

export type QueryConditionValue =
  | ConditionValue
  | {
      kind: 'field';
      column: string;
    }
  | ArgQueryConditionValue;

export type ArgQueryConditionValue = {
  kind: 'arg';
  name: string;
  type: 'Int' | 'Float' | 'String' | string;
};

export type QueryConditionNode =
  | {
      kind: 'comparison';
      left: QueryConditionValue;
      operator: ComparisonOperators;
      right: QueryConditionValue;
    }
  | {
      kind: 'between';
      left: QueryConditionValue;
      operator: 'BETWEEN';
      begin: QueryConditionValue;
      end: QueryConditionValue;
    };
