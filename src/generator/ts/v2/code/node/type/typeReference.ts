import { TsCode } from '../../abstruct/tsCode';

export class TypeReference extends TsCode {
  private isPartial = false;

  constructor(private readonly typeName: string, fromPath?: string) {
    super();
    if (fromPath) this.addImport([typeName], fromPath);
  }

  partial() {
    this.isPartial = true;
    return this;
  }

  protected toTsString(): string {
    if (this.isPartial) return `Partial<${this.typeName}>`;
    return this.typeName;
  }
}
