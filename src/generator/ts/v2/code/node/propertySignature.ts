import { TsCode } from '../abstruct/tsCode';
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

  protected codePrefix(): string {
    return TsUtil.readonly(this.isReadOnly);
  }

  protected toTsString(): string {
    return `${this.propertyName}${TsUtil.questionToken(this.isOptional)}: ${this.type}`;
  }
}
