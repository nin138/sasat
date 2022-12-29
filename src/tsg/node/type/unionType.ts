import { TsCode } from '../../abstruct/tsCode.js';
import { isCode, TsType } from './type.js';

export class UnionType extends TsCode {
  private readonly types: Array<TsType>;
  constructor(...types: TsType[]) {
    super();
    this.types = types;
    const codeTypes = types.filter(it => isCode(it));
    this.mergeImport(...(codeTypes as TsCode[]));
  }

  protected toTsString(): string {
    return this.types.map(it => it.toString()).join(' | ');
  }
}
