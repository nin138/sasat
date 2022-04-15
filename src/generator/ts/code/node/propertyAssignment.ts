import { TsCode } from '../abstruct/tsCode.js';
import { Identifier, Literal } from './expressions.js';

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
