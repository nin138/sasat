import { ImportDeclaration } from '../importDeclaration.js';

export abstract class TsCode {
  protected readonly importDeclarations: ImportDeclaration[] = [];
  addImport(types: string[], module: string): this {
    this.importDeclarations.push(new ImportDeclaration(types, module));
    return this;
  }

  toString(): string {
    return this.codePrefix() + this.toTsString();
  }

  protected codePrefix(): string {
    return '';
  }

  protected mergeImport(...code: Array<TsCode | undefined>): void {
    code.forEach(it => {
      if (it) this.importDeclarations.push(...it.importDeclarations);
    });
  }
  protected abstract toTsString(): string;
}
