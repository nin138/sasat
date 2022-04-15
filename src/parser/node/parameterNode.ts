import { TypeNode } from './typeNode.js';

export class ParameterNode {
  constructor(readonly name: string, readonly type: TypeNode) {}
  toGqlString(): string {
    return `${this.name}: ${this.type.toGqlString()}`;
  }

  static parametersToGqlString(...params: ParameterNode[]): string {
    return params.length === 0 ? '' : `(${params.map(it => it.toGqlString()).join(', ')})`;
  }
}
