import { TsType } from './type';
import { Declaration } from '../../abstruct/declaration';

export class TypeAliasDeclaration extends Declaration {
  constructor(private readonly alias: string, private readonly type: TsType) {
    super();
    this.mergeImport(type);
  }

  protected toTsString(): string {
    return `type ${this.alias} = ${this.type.toString()}`;
  }
}
