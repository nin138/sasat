import { TypeNode } from '../typeNode';

export class ContextNode {
  constructor(readonly name: string, readonly type: TypeNode) {}
}
