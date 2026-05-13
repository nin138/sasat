import { ExportableDeclaration } from '../../abstruct/exportableDeclaration.js';
import { isCode, TsType } from './type.js';

export class TypeAliasDeclaration extends ExportableDeclaration {
  constructor(
    private readonly alias: string,
    private readonly type: TsType,
  ) {
    super();
    if (isCode(type)) this.mergeImport(type);
  }

  protected toTsString(): string {
    return `type ${this.alias} = ${this.type.toString()}`;
  }
}
