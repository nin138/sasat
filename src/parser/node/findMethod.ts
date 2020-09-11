import { ParameterNode } from './parameterNode';
import { TypeNode } from './typeNode';

export class FindMethodNode {
  constructor(
    readonly name: string,
    readonly params: ParameterNode[],
    readonly returnType: TypeNode, // TODO fix
    readonly isPrimary: boolean,
  ) {}
}
