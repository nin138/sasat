export class ImportDeclaration {
  constructor(
    public readonly types: string[],
    public readonly module: string,
  ) {}
  protected toTsString() {
    return `import {${this.types.join(',')} from "${module}";`;
  }
}
