import { unique } from '../../util/arrayUtil';

export interface TsImportStatement {
  from: string;
  names: string[];
}

export class TsFileGenerator {
  protected imports: TsImportStatement[] = [];
  protected lines: string[] = [];

  addImport(from: string, ...names: string[]) {
    const index = this.imports.findIndex(it => it.from === from);
    if (index === -1) {
      this.imports.push({ from, names });
      return;
    }
    this.imports[index] = {
      from,
      names: unique([...this.imports[index].names, ...names]),
    };
  }

  addLine(...line: string[]) {
    this.lines.push(...line);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected preGenerate() {}

  generate() {
    this.preGenerate();
    const importStatement = this.imports
      .map(it => `import { ${it.names.join(',')} } from '${it.from}';\n`)
      .join('');
    return importStatement + this.lines.join('\n');
  }
}
