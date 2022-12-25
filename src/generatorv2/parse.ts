import { DataStoreHandler } from '../migration/dataStore.js';
import { RootNode } from './nodes/rootNode.js';
import { makeMutationNodes } from './parser/makeMutationNodes.js';
import { makeEntityNodes } from './parser/makeEntityNodes.js';
import { makeQueryNodes } from './parser/makeQueryNodes.js';
import { makeSubscriptionNodes } from './parser/makeSubscriptionNode.js';

export const parse = (store: DataStoreHandler): RootNode => {
  return {
    entities: makeEntityNodes(store),
    queries: makeQueryNodes(store),
    mutations: makeMutationNodes(store),
    subscriptions: makeSubscriptionNodes(store),
  };
};
