import { TsCode } from '../tsCode';
import { TsUtil } from '../tsUtil';

export class PropertySignature extends TsCode {
  constructor(
    public readonly propertyName: string,
    public readonly type: string,
    public readonly isOptional = false,
    public readonly isReadOnly = false,
  ) {
    super();
  }

  toTsString(): string {
    return `${TsUtil.readonly(this.isReadOnly)}${
      this.propertyName
    }${TsUtil.questionToken(this.isOptional)}: ${this.type}`;
  }
}
