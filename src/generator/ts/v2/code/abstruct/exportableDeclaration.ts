import { TsStatement } from './statement';

export abstract class ExportableDeclaration extends TsStatement {
  private isExported = false;

  protected codePrefix() {
    return this.isExported ? 'export ' : '';
  }

  export(): this {
    this.isExported = true;
    return this;
  }
}
