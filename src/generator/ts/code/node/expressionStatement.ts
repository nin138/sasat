import { TsStatement } from '../abstruct/statement.js';
import { TsExpression } from './expressions.js';

export class ExpressionStatement extends TsStatement {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return this.expression.toString() + ';';
  }
}
