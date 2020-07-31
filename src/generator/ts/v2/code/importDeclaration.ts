export class ImportDeclaration {
  constructor(public readonly types: string[], public readonly module: string) {}
  toString() {
    return `import {${this.types.join(',')}} from "${this.module}";`;
  }
}
