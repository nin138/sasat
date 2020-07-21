import { TsCode } from '../../tsCode';
import { TypeLiteral } from './typeLiteral';
import { TypeReference } from './typeReference';

export class IntersectionType extends TsCode {
  constructor(private readonly types: Array<TypeLiteral | TypeReference>) {
    super();
    this.mergeImport(...types);
  }

  toTsString(): string {
    return this.types.map(it => it.toTsString).join(' & ');
  }
}
