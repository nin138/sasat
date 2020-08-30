import * as prettier from 'prettier';
import { TsCode } from './code/abstruct/tsCode';
import { TsStatement } from './code/abstruct/statement';
import { ImportDeclaration } from './code/importDeclaration';

export class TsFile extends TsCode {
  private readonly statements: TsStatement[];
  constructor(...statements: TsStatement[]) {
    super();
    this.mergeImport(...statements);
    this.statements = statements;
  }
  protected toTsString(): string {
    const string = [...this.resolveImport(this.importDeclarations), ...this.statements]
      .map(it => it.toString())
      .join('\n');
    return TsFile.prettier(string);
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
    return Object.entries(map).map(([module, types]) => new ImportDeclaration([...new Set(types)], module));
  }

  private static prettier(code: string) {
    return prettier.format(code, { parser: 'typescript' });
  }
}
