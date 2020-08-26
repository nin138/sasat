import { TsCode } from '../abstruct/tsCode';
import { Identifier } from './Identifier';
import { ArrayLiteral, ObjectLiteral } from './literal/literal';

export class SpreadAssignment extends TsCode {
  constructor(private readonly identifier: Identifier | ObjectLiteral | ArrayLiteral) {
    super();
    this.mergeImport(identifier);
  }

  protected toTsString(): string {
    return `...${this.identifier.toString()}`;
  }
}
