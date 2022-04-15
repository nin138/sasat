import { TsStatement } from '../abstruct/statement.js';
import { TsExpression } from './expressions.js';

export class IfStatement extends TsStatement {
  constructor(private readonly condition: TsExpression, private readonly statement: TsStatement) {
    super();
    this.mergeImport(condition, statement);
  }

  protected toTsString(): string {
    return `if(${this.condition})${this.statement}`;
  }
}
