import { TsCode } from '../abstruct/tsCode.js';
import { TypeReference } from './type/typeReference.js';

export class ExtendsClause extends TsCode {
  constructor(private readonly type: TypeReference) {
    super();
    this.mergeImport(type);
  }

  protected toTsString(): string {
    return `extends ${this.type}`;
  }
}
