import type { DataStoreHandler } from '../migration/dataStore.js';
import type { RootNode } from './nodes/rootNode.js';
import { makeContextNodes } from './parser/makeContextNodes.js';
import { makeEntityNodes } from './parser/makeEntityNodes.js';
import { makeSubscriptionNodes } from './parser/makeSubscriptionNode.js';

export const parse = (store: DataStoreHandler): RootNode => {
  store.tables.forEach(it => {
    if (it.primaryKey.length === 0) {
      throw new Error(`Table: ${it.tableName} has no primary key.`);
    }
  });
  return {
    entities: makeEntityNodes(store),
    subscriptions: makeSubscriptionNodes(store),
    contexts: makeContextNodes(store),
  };
};
