import { TsCode } from '../abstruct/tsCode';
import { TsUtil } from '../tsUtil';
import { PropertyModifiers } from './modifier/propertyModifiers';
import { Literal } from './literal/literal';
import { Identifier } from './Identifier';

export class PropertyDeclaration extends TsCode {
  constructor(
    private propertyName: string,
    private type: string,
    private isOptional = false,
    private modifiers = new PropertyModifiers(),
    private initializer?: Literal | Identifier,
  ) {
    super();
  }

  protected toTsString(): string {
    const initializer = this.initializer
      ? ` = ${this.initializer.toString()}`
      : '';
    return (
      this.modifiers.toString() +
      `${this.propertyName}${TsUtil.questionToken(this.isOptional)}: ${
        this.type
      }` +
      initializer
    );
  }
}
