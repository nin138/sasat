import * as prettier from 'prettier';
import { TsCode } from './code/abstruct/tsCode.js';
import { TsStatement } from './code/abstruct/statement.js';
import { ImportDeclaration } from './code/importDeclaration.js';

export class TsFile extends TsCode {
  private esLintDisabled = false;
  private readonly statements: TsStatement[];
  constructor(...statements: TsStatement[]) {
    super();
    this.mergeImport(...statements);
    this.statements = statements;
  }
  protected toTsString(): string {
    const string = [
      ...this.resolveImport(this.importDeclarations),
      ...this.statements,
    ]
      .map(it => it.toString())
      .join('\n');
    return (this.esLintDisabled ? "/* eslint-disable */\n" : '') + TsFile.prettier(string);
  }

  protected resolveImport(imports: ImportDeclaration[]): ImportDeclaration[] {
    const map: Record<string, string[]> = {};
    imports.forEach(it => {
      if (!map[it.module]) {
        map[it.module] = it.types;
      } else {
        map[it.module] = [...map[it.module], ...it.types];
      }
    });
    return Object.entries(map).map(
      ([module, types]) => new ImportDeclaration([...new Set(types)], module),
    );
  }
  disableEsLint() {
    this.esLintDisabled = true;
    return this;
  }

  enableEsLint() {
    this.esLintDisabled = false;
    return this;
  }

  private static prettier(code: string) {
    return prettier.format(code, { parser: 'typescript' });
  }
}
