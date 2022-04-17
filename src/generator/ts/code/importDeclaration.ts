export class ImportDeclaration {
  constructor(public readonly types: string[], public readonly module: string) {}
  toString(): string {
    return `import {${this.types.join(',')}} from "${this.module.startsWith('.') ? this.module + '.js' : this.module }";`;
  }
}
