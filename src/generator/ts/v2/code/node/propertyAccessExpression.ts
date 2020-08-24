import { TsExpression } from '../abstruct/expression';

export class PropertyAccessExpression extends TsExpression {
  constructor(private readonly expression: TsExpression, private readonly propertyName: string) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return `${this.expression.toString()}.${this.propertyName}`;
  }
}
