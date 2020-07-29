import { TsStatement } from '../abstruct/statement';
import { TsExpression } from '../abstruct/expression';

export class ReturnStatement extends TsStatement {
  constructor(private readonly expression: TsExpression) {
    super();
  }

  protected toTsString(): string {
    return `return ${this.expression.toString()};`;
  }
}
