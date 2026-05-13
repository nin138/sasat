import type { EntityName } from "../../generatorv2/nodes/entityName.js";
import type { ArgNode, TypeNode } from "./typeNode.js";

type QueryType = "primary" | "list";

export type QueryNode = {
  type: QueryType;
  queryName: string;
  entityName: EntityName;
  dsMethodName: string;
  returnType: TypeNode;
  args: ArgNode[];
  pageable: boolean;
};
