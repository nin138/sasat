import { TsExpression } from '../abstruct/expression';

export class CallExpression extends TsExpression {
  private readonly args: TsExpression[];
  constructor(private readonly identifier: TsExpression, ...args: TsExpression[]) {
    super();
    this.mergeImport(identifier, ...args);
    this.args = args;
  }

  protected toTsString(): string {
    return this.identifier.toString() + `(${this.args.map(it => it.toString()).join(',')})`;
  }
}
