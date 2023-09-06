import { QueryConditionNode } from '../../../nodes/QueryConditionNode.js';
import { tsg } from '../../../../tsg/index.js';
import { makeConditionValueQExpr } from './makeConditonValueExpr.js';

const qExpr = tsg.identifier('qe').importFrom('sasat');

export const makeQueryConditionExpr = (condition: QueryConditionNode) => {
  if (condition.kind === 'between') {
    return qExpr
      .property('between')
      .call(
        makeConditionValueQExpr(condition.left),
        makeConditionValueQExpr(condition.begin),
        makeConditionValueQExpr(condition.end),
      );
  }
  return qExpr
    .property('comparison')
    .call(
      makeConditionValueQExpr(condition.left),
      tsg.string(condition.operator),
      makeConditionValueQExpr(condition.right),
    );
};
