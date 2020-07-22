import { TsCode } from '../abstruct/tsCode';
import { TsType } from './type/type';
import { MethodModifiers } from './modifier/methodModifiers';
import { Parameter } from './parameter';

export class MethodDeclaration extends TsCode {
  constructor(
    private methodName: string,
    private params: Parameter[],
    private returnType: TsType,
    private methodString: string, // TODO
    private modifiers: MethodModifiers = new MethodModifiers(),
  ) {
    super();
  }

  protected toTsString(): string {
    return (
      this.modifiers.toString() +
      `${this.methodName}(${this.params.map(it => it.toString()).join(',')}): ${
        this.returnType
      }` +
      `{${this.methodString}}\n`
    );
  }
}
