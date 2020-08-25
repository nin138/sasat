import { TsExpression } from '../abstruct/expression';
import { Literal } from './literal/literal';
import { Parameter } from './parameter';
import { TsType } from './type/type';
import { Block } from './Block';

export class ArrowFunction extends Literal {
  constructor(private params: Parameter[], private returnType: TsType | undefined, private body: TsExpression | Block) {
    super();
    this.mergeImport(...params, body, returnType);
  }

  protected toTsString(): string {
    const returnType = this.returnType ? `: ${this.returnType}` : '';
    return `(${Parameter.arrayToString(this.params)})${returnType} => ${this.body.toString()}`;
  }
}
