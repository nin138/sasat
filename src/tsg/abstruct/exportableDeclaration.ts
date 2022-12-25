import { TsStatement } from './statement.js';

export abstract class ExportableDeclaration extends TsStatement {
  private isExported = false;

  protected codePrefix(): string {
    return this.isExported ? 'export ' : '';
  }

  export(): this {
    this.isExported = true;
    return this;
  }
}
