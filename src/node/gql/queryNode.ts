import { ParameterNode } from '../parameterNode';
import { TypeNode } from '../typeNode';

export class QueryNode {
  constructor(readonly queryName: string, readonly queryParams: ParameterNode[], readonly returnType: TypeNode) {}
  toGqlString() {
    return `${this.queryName}${ParameterNode.parametersToGqlString(
      ...this.queryParams,
    )}: ${this.returnType.toGqlString()}`;
  }
}
