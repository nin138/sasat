import { TsStatement } from '../abstruct/statement.js';

export class Block extends TsStatement {
  private readonly statements: TsStatement[];
  constructor(...statements: TsStatement[]) {
    super();
    this.mergeImport(...statements);
    this.statements = statements;
  }

  protected toTsString(): string {
    return `{${this.statements.map(it => it.toString()).join('\n')}}`;
  }
}
