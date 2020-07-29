import { TsStatement } from './code/abstruct/statement';
import * as prettier from 'prettier';
import { ImportDeclaration } from './code/importDeclaration';
import { TsCode } from './code/abstruct/tsCode';

export class TsFile extends TsCode {
  private readonly statements: TsStatement[];
  constructor(...statements: TsStatement[]) {
    super();
    this.mergeImport(...statements);
    this.statements = statements;
  }
  toTsString() {
    return TsFile.prettier(
      [...this.resolveImport(this.importDeclarations), ...this.statements].map(it => it.toString()).join('\n'),
    );
  }

  resolveImport(imports: ImportDeclaration[]) {
    const map: Record<string, string[]> = {};
    imports.forEach(it => {
      if (!map[it.module]) {
        map[it.module] = it.types;
      } else {
        map[it.module] = [...map[it.module], ...it.types];
      }
    });
    return Object.entries(map).map(([module, types]) => new ImportDeclaration(types, module));
  }

  private static prettier(code: string) {
    return prettier.format(code, { parser: 'typescript' });
  }
}
