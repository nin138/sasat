import { TsType } from './type/type';
import { TsCode } from '../abstruct/tsCode';

export class Parameter extends TsCode {
  constructor(private paramName: string, private type: TsType) {
    super();
    if (type instanceof TsCode) this.mergeImport(type);
  }

  protected toTsString(): string {
    return `${this.paramName}: ${this.type.toString()}`;
  }

  public static arrayToString(params: Parameter[]): string {
    return params.map(it => it.toString()).join(',');
  }
}
