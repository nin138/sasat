import { TsCode } from '../abstruct/tsCode';
import { TypeReference } from './type/typeReference';

export class ImplementsClause extends TsCode {
  private readonly types: TypeReference[];
  constructor(...types: TypeReference[]) {
    super();
    this.types = types;
    this.mergeImport(...types);
  }

  protected toTsString(): string {
    return `implements ${this.types.join(',')}`;
  }
}
