import { TsExpression } from '../abstruct/expression';

export class NonNullExpression extends TsExpression {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return `${this.expression}!`;
  }
}
