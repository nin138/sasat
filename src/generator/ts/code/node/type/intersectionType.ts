import { TsCode } from '../../abstruct/tsCode';
import { TypeLiteral } from './typeLiteral';
import { TypeReference } from './typeReference';

export class IntersectionType extends TsCode {
  private readonly types: Array<TypeLiteral | TypeReference>;
  constructor(...types: Array<TypeLiteral | TypeReference>) {
    super();
    this.types = types;
    this.mergeImport(...types);
  }

  protected toTsString(): string {
    return this.types.map(it => it.toString()).join(' & ');
  }
}
