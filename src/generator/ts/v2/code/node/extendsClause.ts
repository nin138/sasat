import { TsCode } from '../abstruct/tsCode';

export class ExtendsClause extends TsCode {
  constructor(private readonly identifier: string) {
    super();
  }

  protected toTsString(): string {
    return `extend ${this.identifier}`;
  }
}
