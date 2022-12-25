import { TsStatement } from '../abstruct/statement.js';
import { TsExpression } from './expressions.js';

export class ReturnStatement extends TsStatement {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return `return ${this.expression.toString()};`;
  }
}
