import { TsExpression } from '../abstruct/expression';

export class Identifier extends TsExpression {
  constructor(private readonly name: string) {
    super();
  }

  protected toTsString(): string {
    return this.name;
  }
}
