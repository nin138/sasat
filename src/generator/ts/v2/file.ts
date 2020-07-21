import { TsStatement } from './code/statement';
import { TsCode } from './code/tsCode';
import * as prettier from 'prettier';

export class TsFile extends TsCode {
  constructor(private readonly statements: TsStatement[]) {
    super();
    this.mergeImport(...statements);
  }
  toTsString() {
    return TsFile.prettier(
      [...this.importDeclarations, ...this.statements]
        .map(it => it.toTsString())
        .join('\n'),
    );
  }

  private static prettier(code: string) {
    return prettier.format(code, { parser: 'typescript' });
  }
}
