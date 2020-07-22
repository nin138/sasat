import { TsCode } from '../../abstruct/tsCode';
import { TsType } from './type';

export class ArrayType extends TsCode {
  constructor(private readonly type: TsType) {
    super();
    if (type instanceof TsCode) this.mergeImport(type);
  }

  protected toTsString(): string {
    return `Array<${this.type.toString()}>`;
  }
}
