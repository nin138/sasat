import { TsCode } from '../../tsCode';
import { TsType } from './type';

export class TypeAliasDeclaration extends TsCode {
  constructor(private readonly alias: string, private readonly type: TsType) {
    super();
    this.mergeImport(type);
  }

  toTsString(): string {
    return `type ${this.alias} = ${this.type.toTsString}`;
  }
}
