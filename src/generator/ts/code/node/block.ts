import { TsStatement } from '../abstruct/statement.js';

const notNull = <T>(v: T | null): v is T => {
  return v !== null;
}

export class Block extends TsStatement {
  private readonly statements: TsStatement[];
  constructor(...statements: (TsStatement | null)[]) {
    super();
    const sts = statements.filter(notNull);
    this.mergeImport(...sts);
    this.statements = sts;
  }

  protected toTsString(): string {
    return `{${this.statements.map(it => it.toString()).join('\n')}}`;
  }
}
