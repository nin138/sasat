import { TypeNode } from '../typeNode.js';

export class ContextNode {
  constructor(readonly name: string, readonly type: TypeNode) {}
}
