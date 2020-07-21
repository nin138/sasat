export class ImportDeclaration {
  constructor(
    private readonly types: string[],
    private readonly module: string,
  ) {}
  toTsString() {
    return `import {${this.types.join(',')} from "${module}";`;
  }
}
