import { PropertySignature } from './propertySignature.js';
import { ExportableDeclaration } from '../abstruct/exportableDeclaration.js';
import { TsType } from './type/type.js';
import {ExtendsClause} from "./extendsClause";

export class TsInterface extends ExportableDeclaration {
  private properties: PropertySignature[] = [];
  private _extends?: ExtendsClause;
  constructor(private readonly name: string) {
    super();
  }
  addProperty(
    propertyName: string,
    type: TsType,
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

  extends(value: ExtendsClause): this {
    this._extends = value;
    this.mergeImport(value);
    return this;
  }

  protected toTsString(): string {
    const extend = this._extends ? this._extends.toString() + ' ' : '';
    return `interface ${this.name} ${extend}{${this.properties
      .map(it => it.toString())
      .join(';')}}`;
  }
}
