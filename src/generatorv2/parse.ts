import { DataStoreHandler } from '../migration/dataStore.js';
import { RootNode } from './nodes/rootNode.js';
import { makeMutationNodes } from './parser/makeMutationNodes.js';
import { makeEntityNodes } from './parser/makeEntityNodes.js';
import { makeSubscriptionNodes } from './parser/makeSubscriptionNode.js';
import { makeContextNodes } from './parser/makeContextNodes.js';

export const parse = (store: DataStoreHandler): RootNode => {
  store.tables.forEach(it => {
    if (it.primaryKey.length === 0) {
      throw new Error(`Table: ${it.tableName} has no primary key.`);
    }
  });
  return {
    entities: makeEntityNodes(store),
    mutations: makeMutationNodes(store),
    subscriptions: makeSubscriptionNodes(store),
    contexts: makeContextNodes(store),
  };
};
