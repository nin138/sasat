import { TsCode } from '../abstruct/tsCode';
import { Identifier, Literal } from './expressions';

export class PropertyAssignment extends TsCode {
  constructor(private readonly key: string, private readonly value?: Literal | Identifier) {
    super();
    this.mergeImport(value);
  }

  protected toTsString(): string {
    if (!this.value) return this.key;
    return `${this.key}: ${this.value.toString()}`;
  }
}
