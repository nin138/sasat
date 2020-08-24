import { TsExpression } from '../abstruct/expression';

export class AwaitExpression extends TsExpression {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return 'await ' + this.expression.toString();
  }
}
