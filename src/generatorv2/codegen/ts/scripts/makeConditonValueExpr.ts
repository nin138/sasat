import { TsExpression, tsg } from '../../../../tsg/index.js';
import { QueryConditionValue } from '../../../nodes/QueryConditionNode.js';
import { JoinConditionValue } from 'generatorv2/nodes/JoinConditionNode';

const qExpr = tsg.identifier('qe').importFrom('sasat');

export const makeConditionValueRaw = (cv: JoinConditionValue): TsExpression => {
  const arg = tsg.identifier('arg');
  const context = arg.property('context?');
  switch (cv.kind) {
    case 'context': {
      const value = context.property(cv.field);
      if (cv.onNotDefined.action !== 'defaultValue') {
        return value;
      }
      return tsg.binary(
        context.property(cv.field),
        '||',
        typeof cv.onNotDefined.value === 'string'
          ? tsg.string(cv.onNotDefined.value)
          : tsg.number(cv.onNotDefined.value),
      );
    }
    case 'fixed': {
      return typeof cv.value === 'string'
        ? tsg.string(cv.value)
        : tsg.number(cv.value);
    }
    case 'today': {
      return tsg
        .identifier(
          cv.type === 'datetime'
            ? 'getTodayDateTimeString'
            : 'getTodayDateString',
        )
        .importFrom('sasat')
        .call();
    }
    case 'now': {
      return tsg
        .identifier('dateString')
        .importFrom('sasat')
        .call(tsg.new(tsg.identifier('Date')));
    }
    default:
      throw Error(`not implemented: makeConditionValue.${cv.kind}`);
  }
};

export const makeConditionValueQExpr = (
  cv: QueryConditionValue,
): TsExpression => {
  const arg = tsg.identifier('arg');
  const context = arg.property('context?');
  switch (cv.kind) {
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
    case 'fixed': {
      return qExpr
        .property('value')
        .call(
          typeof cv.value === 'string'
            ? tsg.string(cv.value)
            : tsg.number(cv.value),
        );
    }
    case 'today': {
      return qExpr.property('value').call(
        tsg
          .identifier(
            cv.type === 'datetime'
              ? 'getTodayDateTimeString'
              : 'getTodayDateString',
          )
          .importFrom('sasat')
          .call(),
      );
    }
    case 'now': {
      return qExpr.property('value').call(
        tsg
          .identifier('dateString')
          .importFrom('sasat')
          .call(tsg.new(tsg.identifier('Date'))),
      );
    }
    case 'arg': {
      return qExpr.property('value').call(tsg.identifier(cv.name));
    }
    case 'field': {
      return qExpr
        .property('field')
        .call(tsg.string('t0'), tsg.string(cv.column));
    }
  }
};
