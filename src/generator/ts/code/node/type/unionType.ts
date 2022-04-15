import { TsCode } from '../../abstruct/tsCode.js';
import { isCode, TsType } from './type.js';

export class UnionType extends TsCode {
  constructor(private readonly types: TsType[]) {
    super();
    const codeTypes = types.filter(it => isCode(it));
    this.mergeImport(...(codeTypes as TsCode[]));
  }

  protected toTsString(): string {
    return this.types.map(it => it.toString()).join(' | ');
  }
}
