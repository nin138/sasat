import { columnTypeToTsType } from "../../migration/column/columnTypes.js";
import type { DataStoreHandler } from "../../migration/dataStore.js";
import type { ContextNode } from "../nodes/contextNode.js";

export const makeContextNodes = (store: DataStoreHandler): ContextNode[] => {
  const contexts = new Map<string, ContextNode>();
  for (const table of store.tables) {
    for (const mutation of table.gqlOption.mutations) {
      for (const field of mutation.contextFields) {
        const node = {
          name: field.contextName || field.column,
          dbtype: table.column(field.column).dataType(),
        };
        const existing = contexts.get(node.name);
        if (
          existing &&
          columnTypeToTsType(existing.dbtype) !==
            columnTypeToTsType(node.dbtype)
        )
          throw new Error(`Conflicting context types for ${node.name}`);
        if (!existing) contexts.set(node.name, node);
      }
    }
  }
  return [...contexts.values()];
};
