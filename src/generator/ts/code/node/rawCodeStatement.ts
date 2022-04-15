import { TsStatement } from '../abstruct/statement.js';

export class RawCodeStatement extends TsStatement {
  constructor(private readonly code: string) {
    super();
  }

  protected toTsString(): string {
    return this.code;
  }
}
