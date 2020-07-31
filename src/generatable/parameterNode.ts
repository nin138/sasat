import { TypeNode } from './typeNode';

export class ParameterNode {
  constructor(readonly name: string, readonly type: TypeNode) {}
}
