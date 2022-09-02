import { ParameterNode } from '../parameterNode.js';
import { TypeNode } from '../typeNode.js';

export class QueryNode {
  constructor(
    readonly queryName: string,
    readonly repoMethodName: string,
    readonly queryParams: ParameterNode[],
    readonly returnType: TypeNode,
    readonly isList: boolean,
  ) {}
  toGqlString(): string {
    return `${this.queryName}${ParameterNode.parametersToGqlString(
      ...this.queryParams,
    )}: ${this.returnType.toGqlString()}`;
  }
}
