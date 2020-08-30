import { TsStatement } from '../abstruct/statement';
import { Block } from './block';
import { TsExpression } from './expressions';

export class IfStatement extends TsStatement {
  constructor(private readonly condition: TsExpression, private readonly block: Block) {
    super();
    this.mergeImport(condition, block);
  }

  protected toTsString(): string {
    return `if(${this.condition})${this.block}`;
  }
}
