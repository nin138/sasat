import { TsExpression } from '../abstruct/expression';

type Token = '===' | '!==' | '+' | '-' | '*' | '/' | '||' | '&&';
export class BinaryExpression extends TsExpression {
  constructor(
    private readonly left: TsExpression,
    private readonly operator: Token,
    private readonly right: TsExpression,
  ) {
    super();
    this.mergeImport(left, right);
  }

  protected toTsString(): string {
    return this.left + this.operator + this.right;
  }
}
