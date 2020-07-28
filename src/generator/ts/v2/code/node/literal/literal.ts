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

export class ArrayLiteral extends Literal {
  constructor(private readonly literals: Literal[]) {
    super();
    this.mergeImport(...literals);
  }

  protected toTsString(): string {
    return `[${this.literals.map(it => it.toString()).join(',')}]`;
  }
}
