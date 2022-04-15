import { TsCode } from '../abstruct/tsCode.js';
import { ArrayLiteral, Identifier, ObjectLiteral } from './expressions.js';

export class SpreadAssignment extends TsCode {
  constructor(private readonly identifier: Identifier | ObjectLiteral | ArrayLiteral) {
    super();
    this.mergeImport(identifier);
  }

  protected toTsString(): string {
    return `...${this.identifier.toString()}`;
  }
}
