import { ParameterNode } from '../parameterNode';

export class TypeDefNode {
  constructor(readonly typeName: string, readonly params: ParameterNode[]) {}
}
