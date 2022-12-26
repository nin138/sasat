import { ArgNode, TypeNode } from './typeNode.js';
import { EntityName } from '../../parser/node/entityName.js';

type QueryType = 'primary' | 'list';

export type QueryNode = {
  type: QueryType;
  queryName: string;
  entityName: EntityName;
  dsMethodName: string;
  returnType: TypeNode;
  args: ArgNode[];
  pageable: boolean;
};
