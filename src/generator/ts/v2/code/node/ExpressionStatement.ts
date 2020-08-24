import { TsExpression } from '../abstruct/expression';
import { TsStatement } from '../abstruct/statement';

export class ExpressionStatement extends TsStatement {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return this.expression.toString() + ';';
  }
}
