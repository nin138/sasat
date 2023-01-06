import {
  EntityNode,
  ReferencedNode,
  ReferenceNode,
} from '../../../nodes/entityNode.js';
import {
  ConditionNode,
  ConditionValue,
  ContextConditionRangeValue,
} from '../../../nodes/ConditionNode.js';
import { TsExpression, tsg } from '../../../../tsg/index.js';
import { makeThrowExpressions } from './makeNoContexError.js';
import { nonNullableFilter } from '../../../../util/type.js';

const parentTableAlias = 'parentTableAlias';
const childTableAlias = 'childTableAlias';

const qExpr = tsg.identifier('QExpr').importFrom('sasat');

const makeConditionValueQExpr = (
  node: EntityNode,
  cv: ConditionValue,
): TsExpression => {
  const arg = tsg.identifier('arg');
  const context = arg.property('context?');
  switch (cv.type) {
    case 'context': {
      const value = context.property(cv.field);
      if (cv.onNotDefined.action !== 'defaultValue') {
        return qExpr.property('value').call(value);
      }
      return qExpr
        .property('value')
        .call(
          tsg.binary(
            context.property(cv.field),
            '||',
            typeof cv.onNotDefined.value === 'string'
              ? tsg.string(cv.onNotDefined.value)
              : tsg.number(cv.onNotDefined.value),
          ),
        );
    }
    case 'parent': {
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
    case 'child': {
      const columnName =
        node.fields.find(it => it.fieldName === cv.field)?.columnName ||
        cv.field;
      return qExpr
        .property('field')
        .call(arg.property(childTableAlias), tsg.string(columnName));
    }
    case 'fixed': {
      return qExpr
        .property('value')
        .call(
          typeof cv.value === 'string'
            ? tsg.string(cv.value)
            : tsg.number(cv.value),
        );
    }
  }
};

const makeRangeCondition = (
  entity: EntityNode,
  range: ContextConditionRangeValue,
): TsExpression[] => {
  if (range.type === 'range') {
    return [
      makeConditionValueQExpr(entity, range.begin),
      makeConditionValueQExpr(entity, range.end),
    ];
  }
  // const date = tsg.identifier('dateOffset').importFrom('sasat').call(tsg.new(tsg.identifier('Date')));
  // const r = tsg.identifier('dateToString').importFrom('sasat').call();
  return [
    tsg.spread(
      tsg
        .identifier('getDayRangeQExpr')
        .importFrom('sasat')
        .call(tsg.new(tsg.identifier('Date'))),
    ),
  ];
};

const makeConditionExpr = (entity: EntityNode, condition: ConditionNode) => {
  if (condition.operator === 'BETWEEN') {
    condition.right.type;
    return qExpr
      .property('conditions')
      .property('between')
      .call(
        makeConditionValueQExpr(entity, condition.left),
        ...makeRangeCondition(entity, condition.right),
      );
  }
  return qExpr
    .property('conditions')
    .property('comparison')
    .call(
      makeConditionValueQExpr(entity, condition.left),
      tsg.string(condition.operator),
      makeConditionValueQExpr(entity, condition.right),
    );
};

export const makeCondition = (
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
          .filter(nonNullableFilter),
        tsg.return(
          qExpr
            .property('conditions')
            .property('and')
            .call(...ref.joinCondition.map(it => makeConditionExpr(node, it))),
        ),
      ),
    ),
  );
};
