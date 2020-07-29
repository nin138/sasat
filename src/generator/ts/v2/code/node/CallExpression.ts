import { Identifier } from './Identifier';
import { TsExpression } from '../abstruct/expression';

export class CallExpression extends TsExpression {
  private readonly args: TsExpression[];
  constructor(
    private readonly identifier: Identifier,
    ...args: TsExpression[]
  ) {
    super();
    this.mergeImport(identifier);
    this.args = args;
  }

  protected toTsString(): string {
    return (
      this.identifier.toString() +
      `(${this.args.map(it => it.toString()).join(',')})`
    );
  }
}
