export class ImportDeclaration {
  constructor(
    public readonly types: string[],
    public readonly module: string,
  ) {}
  toTsString() {
    return `import {${this.types.join(',')} from "${module}";`;
  }
}
