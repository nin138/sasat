import {
  ConditionNode,
  ConditionValue,
  ContextConditionRangeValue,
} from '../../../nodes/ConditionNode.js';
import { IfStatement, tsg } from '../../../../tsg/index.js';

const makeJoinRangeConditionThrowExpressions = (
  cv: ContextConditionRangeValue,
): (IfStatement | null)[] => {
  if (cv.type === 'range') {
    const result = [];
    if (cv.begin.type === 'context')
      result.push(makeJoinConditionThrowExpressions(cv.begin));
    if (cv.end.type === 'context')
      result.push(makeJoinConditionThrowExpressions(cv.end));
    return result;
  }
  return [];
};

const makeJoinConditionThrowExpressions = (cv: ConditionValue) => {
  if (cv.type !== 'context') return null;
  if (cv.onNotDefined.action !== 'error') return null;
  return tsg.if(
    tsg.binary(
      tsg.identifier('!arg.context'),
      '||',
      tsg.binary(
        tsg.identifier('arg.context').property(cv.field),
        '===',
        tsg.identifier('undefined'),
      ),
    ),
    tsg.throw(
      tsg.new(tsg.identifier('Error'), tsg.string(cv.onNotDefined.message)),
    ),
  );
};

export const makeThrowExpressions = (condition: ConditionNode) => {
  if (condition.type === 'custom') return [];
  if (condition.operator === 'BETWEEN') {
    return [
      makeJoinConditionThrowExpressions(condition.left),
      ...(condition.right.type === 'range'
        ? makeJoinRangeConditionThrowExpressions(condition.right)
        : []),
    ];
  }
  return [
    makeJoinConditionThrowExpressions(condition.left),
    makeJoinConditionThrowExpressions(condition.right),
  ];
};
