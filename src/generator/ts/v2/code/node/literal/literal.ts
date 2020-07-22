import { TsCode } from '../../abstruct/tsCode';

export abstract class Literal extends TsCode {}

export class StringLiteral extends Literal {
  constructor(private value: string) {
    super();
  }

  protected toTsString(): string {
    return `'${this.value.replace("'", "\\'")}'`;
  }
}
