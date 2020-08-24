import { TsStatement } from '../abstruct/statement';
import { TsExpression } from '../abstruct/expression';
import { Block } from './block';

export class IfStatement extends TsStatement {
  constructor(private readonly condition: TsExpression, private readonly block: Block) {
    super();
    this.mergeImport(condition, block);
  }

  protected toTsString(): string {
    return `if(${this.condition})${this.block}`;
  }
}
