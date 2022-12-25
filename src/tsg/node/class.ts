import { ExportableDeclaration } from '../abstruct/exportableDeclaration.js';
import { PropertyDeclaration } from './propertyDeclaration.js';
import { MethodDeclaration } from './methodDeclaration.js';
import { ExtendsClause } from './extendsClause.js';
import { ImplementsClause } from './implementsClause.js';

export class Class extends ExportableDeclaration {
  private properties: PropertyDeclaration[] = [];
  private _extends?: ExtendsClause;
  private _implements?: ImplementsClause;
  private methods: MethodDeclaration[] = [];
  private isAbstract = false;

  constructor(private readonly name: string) {
    super();
  }

  abstract(): this {
    this.isAbstract = true;
    return this;
  }

  extends(value: ExtendsClause): this {
    this._extends = value;
    this.mergeImport(value);
    return this;
  }

  implements(value: ImplementsClause): this {
    this._implements = value;
    this.mergeImport(value);
    return this;
  }

  addProperty(...properties: PropertyDeclaration[]): this {
    this.properties.push(...properties);
    this.mergeImport(...properties);
    return this;
  }

  addMethod(...methods: MethodDeclaration[]): this {
    this.methods.push(...methods);
    this.mergeImport(...methods);
    return this;
  }

  protected toTsString(): string {
    const properties = this.properties.map(it => it.toString()).join('');
    const methods = this.methods.map(it => it.toString()).join('');
    const implement = this._implements ? this._implements.toString() + ' ' : '';
    const extend = this._extends ? this._extends.toString() + '' : '';
    const modifier = this.isAbstract ? 'abstract ' : '';
    return (
      modifier +
      `class ${this.name} ${implement}${extend}{${properties}${methods}}`
    );
  }
}
