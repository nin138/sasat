import { ReferencedNode, ReferenceNode } from '../../../nodes/entityNode.js';
import { ConditionNode, ConditionValue } from '../../../nodes/ConditionNode.js';
import { nonNullable } from '../../../../runtime/util.js';

type GetConditionValue = (cv: ConditionValue) => string | null;

const getParentConditionValue: GetConditionValue = cv => {
  if (cv.type === 'parent') {
    return cv.field;
  }
  return null;
};

const getChildConditionValue: GetConditionValue = cv => {
  if (cv.type === 'child') {
    return cv.field;
  }
  return null;
};

const getConditionParentColumnNames =
  (getConditionValue: GetConditionValue) =>
  (c: ConditionNode): (string | null)[] => {
    const result = [getConditionValue(c.left)];
    if (c.operator !== 'BETWEEN') {
      result.push(getConditionValue(c.right));
    } else {
      if (c.right.type === 'range') {
        result.push(
          getConditionValue(c.right.begin),
          getConditionValue(c.right.end),
        );
      }
    }
    return result;
  };

export const getParentRequiredFieldNames = (
  ref: ReferenceNode | ReferencedNode,
): string[] => {
  const getNames = getConditionParentColumnNames(getParentConditionValue);
  return ref.joinCondition.flatMap(getNames).filter(nonNullable);
};

export const getChildRequiredNames = (
  ref: ReferencedNode | ReferenceNode,
): string[] => {
  const getNames = getConditionParentColumnNames(getChildConditionValue);
  return ref.joinCondition.flatMap(getNames).filter(nonNullable);
};
