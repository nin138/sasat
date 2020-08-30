import { ExportableDeclaration } from '../abstruct/exportableDeclaration';
import { Identifier, TsExpression } from './expressions';

type VariableType = 'const' | 'let';

export class VariableDeclaration extends ExportableDeclaration {
  constructor(
    private readonly type: VariableType,
    private readonly variableName: Identifier,
    private readonly expression: TsExpression | Identifier,
  ) {
    super();
    this.mergeImport(expression, variableName);
  }

  protected toTsString(): string {
    return `${this.type} ${this.variableName} = ${this.expression.toString()};`;
  }
}
