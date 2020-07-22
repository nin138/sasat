import { TsType } from './type';
import { ExportableDeclaration } from '../../abstruct/exportableDeclaration';

export class TypeAliasDeclaration extends ExportableDeclaration {
  constructor(private readonly alias: string, private readonly type: TsType) {
    super();
    this.mergeImport(type);
  }

  protected toTsString(): string {
    return `type ${this.alias} = ${this.type.toString()}`;
  }
}
