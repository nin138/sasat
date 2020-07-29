import { TsCode } from '../../abstruct/tsCode';
import { Identifier } from '../Identifier';

export class TypeReference extends TsCode {
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
    return new TypeReference('Partial', [this]);
  }

  pick(...properties: string[]) {
    return new TypeReference('Pick', [
      this,
      new Identifier(properties.map(it => `'${it}'`).join('|')),
    ]);
  }

  protected toTsString(): string {
    const typeArgs =
      this.typeArguments.length === 0
        ? ''
        : `<${this.typeArguments.join(',')}>`;
    return `${this.typeName}${typeArgs}`;
  }
}
