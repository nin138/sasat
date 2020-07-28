import { TsCode } from '../abstruct/tsCode';

export class ImplementsClause extends TsCode {
  private readonly identifiers: string[];
  constructor(...identifiers: string[]) {
    super();
    this.identifiers = identifiers;
  }

  protected toTsString(): string {
    return `implements ${this.identifiers.join(',')}`;
  }
}
