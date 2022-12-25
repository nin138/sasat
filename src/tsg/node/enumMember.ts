import { TsCode } from '../abstruct/tsCode.js';
import { Identifier, NumericLiteral, StringLiteral } from './expressions.js';

export class EnumMember extends TsCode {
  constructor(
    private readonly identifier: Identifier,
    private readonly value?: StringLiteral | NumericLiteral,
  ) {
    super();
    this.mergeImport(identifier);
    if (value) this.mergeImport(value);
  }
  protected toTsString(): string {
    if (!this.value) return this.identifier.toString();
    return this.identifier + '=' + this.value;
  }
}
