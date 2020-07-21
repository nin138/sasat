import { ImportDeclaration } from './importDeclaration';

export abstract class TsCode {
  protected readonly importDeclarations: ImportDeclaration[] = [];
  addImport(types: string[], module: string): this {
    this.importDeclarations.push(new ImportDeclaration(types, module));
    return this;
  }
  protected mergeImport(...code: TsCode[]) {
    code.forEach(it => this.importDeclarations.push(...it.importDeclarations));
  }
  abstract toTsString(): string;
}
