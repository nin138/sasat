import { TypeNode } from './typeNode';
import { FieldNode } from './fieldNode';

export class ParameterNode {
  constructor(readonly name: string, readonly type: TypeNode) {}
  toGqlString(): string {
    return `${FieldNode.normalizeFieldName(this.name)}: ${this.type.toGqlString()}`;
  }

  static parametersToGqlString(...params: ParameterNode[]): string {
    return params.length === 0 ? '' : `(${params.map(it => it.toGqlString()).join(', ')})`;
  }
}
