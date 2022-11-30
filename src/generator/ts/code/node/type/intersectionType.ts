import { TsCode } from '../../abstruct/tsCode.js';
import { TsType } from './type.js';

export class IntersectionType extends TsCode {
  private readonly types: Array<TsType>;
  constructor(...types: Array<TsType>) {
    super();
    this.types = types;
    this.mergeImport(...types);
  }

  protected toTsString(): string {
    return this.types.map(it => it.toString()).join(' & ');
  }
}
