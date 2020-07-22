import { TsCode } from '../abstruct/tsCode';

export class Identifier extends TsCode {
  constructor(private readonly name: string) {
    super();
  }

  protected toTsString(): string {
    return this.name;
  }
}
