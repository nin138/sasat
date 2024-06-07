import {
  JoinConditionNode,
  JoinConditionValue,
  JoinConditionRangeValue,
} from '../../../nodes/JoinConditionNode.js';
import { IfStatement, tsg } from '../../../../tsg/index.js';

const makeJoinRangeConditionThrowExpressions = (
  cv: JoinConditionRangeValue,
): (IfStatement | null)[] => {
  if (cv.kind === 'range') {
    const result = [];
    if (cv.begin.kind === 'context')
      result.push(makeJoinConditionThrowExpressions(cv.begin));
    if (cv.end.kind === 'context')
      result.push(makeJoinConditionThrowExpressions(cv.end));
    return result;
  }
  return [];
};

const makeJoinConditionThrowExpressions = (cv: JoinConditionValue) => {
  if (cv.kind !== 'context') return null;
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

export const makeThrowExpressions = (condition: JoinConditionNode) => {
  if (condition.kind === 'custom') return [];
  if (condition.operator === 'BETWEEN') {
    return [
      makeJoinConditionThrowExpressions(condition.left),
      ...(condition.right.kind === 'range'
        ? makeJoinRangeConditionThrowExpressions(condition.right)
        : []),
    ];
  }
  if (condition.operator === 'IN') {
    return [
      makeJoinConditionThrowExpressions(condition.left),
      ...condition.right.map(makeJoinConditionThrowExpressions),
    ];
  }
  return [
    makeJoinConditionThrowExpressions(condition.left),
    makeJoinConditionThrowExpressions(condition.right),
  ];
};
