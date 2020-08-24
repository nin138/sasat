import { TsExpression } from '../abstruct/expression';
import { ArrowFunction } from './arrowFunction';

export class AsyncExpression extends TsExpression {
  constructor(private readonly expression: ArrowFunction) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return 'async ' + this.expression.toString();
  }
}
