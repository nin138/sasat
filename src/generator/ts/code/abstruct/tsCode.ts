import { ImportDeclaration } from '../importDeclaration';

export abstract class TsCode {
  protected readonly importDeclarations: ImportDeclaration[] = [];
  addImport(types: string[], module: string): this {
    this.importDeclarations.push(new ImportDeclaration(types, module));
    return this;
  }

  toString() {
    return this.codePrefix() + this.toTsString();
  }

  protected codePrefix(): string {
    return '';
  }

  protected mergeImport(...code: Array<TsCode | undefined>) {
    code.forEach(it => {
      if (it) this.importDeclarations.push(...it.importDeclarations);
    });
  }
  protected abstract toTsString(): string;
}
