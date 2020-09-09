import { TsStatement } from '../abstruct/statement';
import { Block } from './block';
import { TsExpression } from './expressions';

export class IfStatement extends TsStatement {
  constructor(private readonly condition: TsExpression, private readonly statement: TsStatement) {
    super();
    this.mergeImport(condition, statement);
  }

  protected toTsString(): string {
    return `if(${this.condition})${this.statement}`;
  }
}
