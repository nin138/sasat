import { ExportableDeclaration } from '../abstruct/exportableDeclaration';
import { Identifier, TsExpression } from './expressions';
import { TsType } from './type/type';

type VariableType = 'const' | 'let';

export class VariableDeclaration extends ExportableDeclaration {
  constructor(
    private readonly flag: VariableType,
    private readonly variableName: Identifier,
    private readonly expression: TsExpression | Identifier,
    private readonly type?: TsType,
  ) {
    super();
    this.mergeImport(expression, variableName);
  }

  protected toTsString(): string {
    const type = this.type ? ': ' + this.type.toString() : '';
    return `${this.flag} ${this.variableName}${type} = ${this.expression.toString()};`;
  }
}
