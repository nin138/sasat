import { TsCode } from '../abstruct/tsCode';
import { TypeReference } from './type/typeReference';

export class ExtendsClause extends TsCode {
  constructor(private readonly type: TypeReference) {
    super();
  }

  protected toTsString(): string {
    return `extend ${this.type}`;
  }
}
