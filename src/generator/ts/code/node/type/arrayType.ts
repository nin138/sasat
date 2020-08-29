import { TsCode } from '../../abstruct/tsCode';
import { isCode, TsType } from './type';

export class ArrayType extends TsCode {
  constructor(private readonly type: TsType) {
    super();
    if (isCode(type)) this.mergeImport(type);
  }

  protected toTsString(): string {
    return `Array<${this.type.toString()}>`;
  }
}
