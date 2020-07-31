import { TsCode } from '../abstruct/tsCode';
import { Literal } from './literal/literal';
import { Identifier } from './Identifier';

export class PropertyAssignment extends TsCode {
  constructor(private readonly key: string, private readonly value: Literal | Identifier) {
    super();
    this.mergeImport(value);
  }

  protected toTsString(): string {
    return `${this.key}: ${this.value.toString()}`;
  }
}
