import { TypeNode } from './typeNode';

export class ParameterNode {
  constructor(readonly name: string, readonly type: TypeNode) {}
  toGqlString() {
    return `${this.name}: ${this.type.toGqlString()}`;
  }

  static parametersToGqlString(...params: ParameterNode[]) {
    return params.length === 0 ? '' : `(${params.map(it => it.toGqlString()).join(', ')})`;
  }
}
