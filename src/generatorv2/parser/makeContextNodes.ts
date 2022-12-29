import { DataStoreHandler } from '../../migration/dataStore.js';
import { ContextNode } from '../nodes/contextNode.js';

export const makeContextNodes = (store: DataStoreHandler): ContextNode[] => {
  return store.tables.flatMap(table => {
    return table.gqlOption.mutation.fromContextColumns.map(it => ({
      name: it.contextName || it.column,
      dbtype: table.column(it.column).dataType(),
    }));
  });
};
