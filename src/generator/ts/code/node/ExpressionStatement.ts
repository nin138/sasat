import { TsStatement } from '../abstruct/statement';
import { TsExpression } from './expressions';

export class ExpressionStatement extends TsStatement {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return this.expression.toString() + ';';
  }
}
