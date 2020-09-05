import { ExportableDeclaration } from '../abstruct/exportableDeclaration';
import { Identifier, TsExpression } from './expressions';
import { TsType } from './type/type';

type VariableType = 'const' | 'let';

export class VariableDeclaration extends ExportableDeclaration {
  private readonly variableName: Identifier;
  constructor(
    private readonly flag: VariableType,
    variableName: Identifier | string,
    private readonly expression: TsExpression | Identifier,
    private readonly type?: TsType,
  ) {
    super();
    this.variableName = typeof variableName === 'string' ? new Identifier(variableName) : variableName;
    this.mergeImport(expression, this.variableName);
  }

  protected toTsString(): string {
    const type = this.type ? ': ' + this.type.toString() : '';
    return `${this.flag} ${this.variableName}${type} = ${this.expression.toString()};`;
  }
}
