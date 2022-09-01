import { config } from '../../../config/config.js';

export class ImportDeclaration {
  constructor(
    public readonly types: string[],
    public readonly module: string,
  ) {}
  toString(): string {
    const addJsExt =
      config().generator.addJsExtToImportStatement &&
      this.module.startsWith('.');
    return `import {${this.types.join(',')}} from "${
      addJsExt ? this.module + '.js' : this.module
    }";`;
  }
}
