import { TsType } from './type/type.js';
import { TsCode } from '../abstruct/tsCode.js';

export class Parameter extends TsCode {
  constructor(
    private paramName: string,
    private type?: TsType,
  ) {
    super();
    this.mergeImport(type);
  }

  protected toTsString(): string {
    if (!this.type) return this.paramName;
    return `${this.paramName}: ${this.type.toString()}`;
  }

  public static arrayToString(params: Parameter[]): string {
    return params.map(it => it.toString()).join(',');
  }
}
