import { ArgNode, TypeNode } from './typeNode.js';

export type QueryNode = {
  queryName: string;
  returnType: TypeNode;
  args: ArgNode[];
  pageable: boolean;
};
