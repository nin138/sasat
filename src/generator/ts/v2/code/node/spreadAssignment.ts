import { TsCode } from '../abstruct/tsCode';
import { Identifier } from './Identifier';

export class SpreadAssignment extends TsCode {
  constructor(private readonly identifier: Identifier) {
    super();
    this.mergeImport(identifier);
  }

  protected toTsString(): string {
    return `...${this.identifier.toString()}`;
  }
}
