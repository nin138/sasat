import {
  ReferencedNode,
  ReferenceNode,
} from '../../../nodes/ReferencedNode.js';
import {
  JoinConditionNode,
  JoinConditionValue,
} from '../../../nodes/JoinConditionNode.js';
import { nonNullable } from '../../../../runtime/util.js';

type GetConditionValue = (cv: JoinConditionValue) => string | null;

const getChildConditionValue: GetConditionValue = cv => {
  if (cv.kind === 'child') {
    return cv.field;
  }
  return null;
};

const getConditionChildColumnNames =
  (getConditionValue: GetConditionValue) =>
  (c: JoinConditionNode): (string | null)[] => {
    if (c.kind === 'custom') return c.childRequiredFields || [];
    const result = [getConditionValue(c.left)];
    if (c.operator !== 'BETWEEN') {
      result.push(getConditionValue(c.right));
    } else {
      if (c.right.kind === 'range') {
        result.push(
          getConditionValue(c.right.begin),
          getConditionValue(c.right.end),
        );
      }
    }
    return result;
  };

export const getChildRequiredNames = (
  ref: ReferencedNode | ReferenceNode,
): string[] => {
  const getNames = getConditionChildColumnNames(getChildConditionValue);
  return ref.joinCondition.flatMap(getNames).filter(nonNullable);
};
