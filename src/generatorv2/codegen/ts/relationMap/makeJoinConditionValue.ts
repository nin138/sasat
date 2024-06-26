import { EntityNode } from '../../../nodes/entityNode.js';
import {
  JoinConditionNode,
  JoinConditionRangeValue,
  JoinConditionValue,
} from '../../../nodes/JoinConditionNode.js';
import { TsExpression, tsg } from '../../../../tsg/index.js';
import { makeThrowExpressions } from './makeNoContexError.js';
import {
  makeConditionValueQExpr,
  makeConditionValueRaw,
} from '../scripts/makeConditonValueExpr.js';
import { nonNullable } from '../../../../runtime/util.js';
import {
  ReferencedNode,
  ReferenceNode,
} from '../../../nodes/ReferencedNode.js';

const qExpr = tsg.identifier('qe').importFrom('sasat');
const parentTableAlias = 'parentTableAlias';
const childTableAlias = 'childTableAlias';

export const makeJoinConditionValueQExpr = (
  node: EntityNode,
  cv: JoinConditionValue,
): TsExpression => {
  const arg = tsg.identifier('arg');
  switch (cv.kind) {
    case 'parent': {
      const columnName =
        node.fields.find(it => it.fieldName === cv.field)?.columnName ||
        cv.field;
      return qExpr
        .property('field')
        .call(arg.property(childTableAlias), tsg.string(columnName));
    }
    case 'child': {
      const columnName =
        node.fields.find(it => it.fieldName === cv.field)?.columnName ||
        cv.field;
      return tsg.ternary(
        arg.property(parentTableAlias),
        qExpr
          .property('field')
          .call(arg.property(parentTableAlias), tsg.string(columnName)),
        qExpr
          .property('value')
          .call(arg.property('parent?').property(cv.field)),
      );
    }
    default:
      return makeConditionValueQExpr(cv);
  }
};

const makeRangeCondition = (
  entity: EntityNode,
  range: JoinConditionRangeValue,
): TsExpression[] => {
  if (range.kind === 'range') {
    return [
      makeJoinConditionValueQExpr(entity, range.begin),
      makeJoinConditionValueQExpr(entity, range.end),
    ];
  }
  return [
    tsg.spread(
      tsg
        .identifier('getDayRangeQExpr')
        .importFrom('sasat')
        .call(
          tsg.new(tsg.identifier('Date')),
          range.thresholdHour
            ? tsg.number(range.thresholdHour)
            : tsg.identifier('undefined'),
        ),
    ),
  ];
};

const makeConditionExpr = (
  entity: EntityNode,
  condition: JoinConditionNode,
) => {
  if (condition.kind === 'custom') {
    return tsg
      .identifier(condition.conditionName)
      .importFrom('../conditions')
      .call(tsg.identifier('arg'));
  }
  if (condition.operator === 'BETWEEN') {
    return qExpr
      .property('between')
      .call(
        makeJoinConditionValueQExpr(entity, condition.left),
        ...makeRangeCondition(entity, condition.right),
      );
  }
  if (condition.operator === 'IN') {
    return qExpr
      .property('in')
      .call(
        makeJoinConditionValueQExpr(entity, condition.left),
        tsg.array(condition.right.map(it => makeConditionValueRaw(it))),
      );
  }
  return qExpr
    .property('comparison')
    .call(
      makeJoinConditionValueQExpr(entity, condition.left),
      tsg.string(condition.operator),
      makeJoinConditionValueQExpr(entity, condition.right),
    );
};

export const makeJoinConditionValue = (
  node: EntityNode,
  ref: ReferenceNode | ReferencedNode,
) => {
  const arg = tsg.identifier('arg');

  return tsg.propertyAssign(
    'condition',
    tsg.arrowFunc(
      [tsg.parameter(arg.toString())],
      tsg.typeRef('BooleanValueExpression').importFrom('sasat'),
      tsg.block(
        ...ref.joinCondition
          .flatMap(it => makeThrowExpressions(it))
          .filter(nonNullable),
        tsg.return(
          qExpr
            .property('and')
            .call(...ref.joinCondition.map(it => makeConditionExpr(node, it))),
        ),
      ),
    ),
  );
};
