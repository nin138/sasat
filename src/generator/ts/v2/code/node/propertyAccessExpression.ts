import { TsExpression } from '../abstruct/expression';
import { CallExpression } from './callExpression';

export class PropertyAccessExpression extends TsExpression {
  constructor(private readonly expression: TsExpression, private readonly propertyName: string) {
    super();
    this.mergeImport(expression);
  }

  call(...args: TsExpression[]): CallExpression {
    return new CallExpression(this, ...args);
  }

  protected toTsString(): string {
    return `${this.expression.toString()}.${this.propertyName}`;
  }
}
