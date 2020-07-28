import { TsCode } from '../../abstruct/tsCode';
import { Identifier } from '../Identifier';

export class TypeReference extends TsCode {
  private isPartial = false;

  constructor(
    private readonly typeName: string,
    private readonly typeArguments: Array<Identifier | TypeReference> = [],
  ) {
    super();
    this.mergeImport(...typeArguments);
  }

  importFrom(path: string): this {
    this.addImport([this.typeName], path);
    return this;
  }

  partial() {
    this.isPartial = true;
    return this;
  }

  protected toTsString(): string {
    const typeArgs =
      this.typeArguments.length === 0
        ? ''
        : `<${this.typeArguments.join(',')}>`;
    const type = `${this.typeName}${typeArgs}`;
    if (this.isPartial) return `Partial<${type}>`;
    return type;
  }
}
