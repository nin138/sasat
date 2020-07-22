import { ExportableDeclaration } from '../abstruct/exportableDeclaration';
import { PropertyDeclaration } from './propertyDeclaration';
import { MethodDeclaration } from './methodDeclaration';

export class Class extends ExportableDeclaration {
  private properties: PropertyDeclaration[] = [];
  private extends?: string;
  private methods: MethodDeclaration = [];
  // modifiers todo Class modifiers

  constructor(private readonly name: string) {
    super();
  }

  addProperty(...properties: PropertyDeclaration[]): this {
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
