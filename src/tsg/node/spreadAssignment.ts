import { TsCode } from '../abstruct/tsCode.js';
import {
  ArrayLiteral,
  Identifier,
  ObjectLiteral,
  TsExpression,
} from './expressions.js';

export class SpreadAssignment extends TsCode {
  constructor(
    private readonly identifier:
      | Identifier
      | ObjectLiteral
      | ArrayLiteral
      | TsExpression,
  ) {
    super();
    this.mergeImport(identifier);
  }

  protected toTsString(): string {
    return `...${this.identifier.toString()}`;
  }
}
