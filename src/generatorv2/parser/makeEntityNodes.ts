import { DataStoreHandler } from '../../migration/dataStore.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { EntityNode } from '../nodes/entityNode.js';

export const makeEntityNodes = (store: DataStoreHandler) => {
  const make = makeEntityNode(store);
  return store.tables.map(make);
};

const makeEntityNode =
  (store: DataStoreHandler) =>
  (table: TableHandler): EntityNode => {
    return new EntityNode(store, table);
  };
