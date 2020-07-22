import { TsStatement } from './statement';

export abstract class Declaration extends TsStatement {
  private isExported = false;

  protected codePrefix() {
    return this.isExported ? 'export ' : '';
  }

  export(): this {
    this.isExported = true;
    return this;
  }
}
