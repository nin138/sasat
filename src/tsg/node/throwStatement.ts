import { TsStatement } from '../abstruct/statement.js';
import { TsExpression } from './expressions.js';

export class ThrowStatement extends TsStatement {
  constructor(private expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return 'throw ' + this.expression.toString() + ';';
  }
}
