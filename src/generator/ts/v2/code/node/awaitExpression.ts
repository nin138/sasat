import { TsExpression } from '../abstruct/expression';

export class AsyncExpression extends TsExpression {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return 'await ' + this.expression.toString();
  }
}
