import {
  ConditionExpression,
  conditionExpressionToSql,
} from './conditionExpression.js';

export class CompositeCondition<T> {
  private constructor(
    private type: 'AND' | 'OR',
    private conditions: ConditionExpression<T>[],
  ) {}

  static or<T>(conditions: ConditionExpression<T>[]): CompositeCondition<T> {
    return new CompositeCondition('OR', conditions);
  }
  static and<T>(conditions: ConditionExpression<T>[]): CompositeCondition<T> {
    return new CompositeCondition('AND', conditions);
  }

  toSQL(): string {
    return (
      '(' + this.conditions.map(conditionExpressionToSql).join(this.type) + ')'
    );
  }
}
