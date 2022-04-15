import { TsCode } from '../abstruct/tsCode.js';
import { PropertyModifiers } from './modifier/propertyModifiers.js';
import { isCode, TsType } from './type/type.js';
import { TsUtil } from '../tsUtil.js';
import { Identifier, Literal } from './expressions.js';

export class PropertyDeclaration extends TsCode {
  private _modifiers = new PropertyModifiers();
  private _initializer?: Literal | Identifier = undefined;
  constructor(private propertyName: string, private type: TsType, private optional = false) {
    super();
    if (isCode(type)) this.mergeImport(type);
  }

  modifiers(modifiers: PropertyModifiers): this {
    this._modifiers = modifiers;
    return this;
  }

  initializer(initializer: Literal | Identifier): this {
    this._initializer = initializer;
    this.mergeImport(initializer);
    return this;
  }

  protected toTsString(): string {
    const initializer = this._initializer ? ` = ${this._initializer.toString()}` : '';
    return (
      this._modifiers.toString() +
      `${this.propertyName}${TsUtil.questionToken(this.optional)}: ${this.type}` +
      initializer +
      ';'
    );
  }
}
