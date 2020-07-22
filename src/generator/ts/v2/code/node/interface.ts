import { PropertySignature } from './propertySignature';
import { ExportableDeclaration } from '../abstruct/exportableDeclaration';

export class TsInterface extends ExportableDeclaration {
  private properties: PropertySignature[] = [];
  constructor(private readonly name: string) {
    super();
  }
  addProperty(
    propertyName: string,
    type: string,
    isOptional = false,
    isReadOnly = false,
  ): this {
    this.properties.push(
      new PropertySignature(propertyName, type, isOptional, isReadOnly),
    );
    return this;
  }

  addProperties(properties: PropertySignature[]): this {
    this.properties.push(...properties);
    this.mergeImport(...properties);
    return this;
  }

  protected toTsString(): string {
    return `interface ${this.name}{${this.properties
      .map(it => it.toString())
      .join(';')}}`;
  }
}
