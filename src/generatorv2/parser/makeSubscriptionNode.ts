import { DataStoreHandler } from '../../migration/dataStore.js';
import { SubscriptionNode } from '../nodes/subscriptionNode.js';
import { MutationType } from '../nodes/mutationNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { nonNullableFilter } from '../utils.js';

export const makeSubscriptionNodes = (
  store: DataStoreHandler,
): SubscriptionNode[] => {
  return store.tables
    .flatMap(table => {
      const mutation = table.gqlOption.mutation;
      return [
        mutation.create.subscription
          ? makeSubscriptionNode('create', table)
          : undefined,
        mutation.update.subscription
          ? makeSubscriptionNode('update', table)
          : undefined,
        mutation.delete.subscription
          ? makeSubscriptionNode('delete', table)
          : undefined,
      ];
    })
    .filter(nonNullableFilter);
};

const subscriptionNamePostfix = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

const makeSubscriptionNode = (
  mutationType: MutationType,
  table: TableHandler,
): SubscriptionNode => {
  return {
    subscriptionName:
      table.getEntityName().lowerCase() + subscriptionNamePostfix[mutationType],
    returnType: {
      typeName: table.getEntityName().name,
      nullable: false,
      array: false,
      entity: true,
    },
    args: table.gqlOption.mutation[mutationType].subscriptionFilter.map(it => {
      const column = table.column(it);
      return {
        name: it,
        type: {
          typeName: column.gqlType(),
          dbType: column.dataType(),
          nullable: false,
          array: false,
          entity: false,
        },
      };
    }),
    mutationType,
    gqlEnabled:
      table.gqlOption.enabled && table.gqlOption.mutation[mutationType].enabled,
  };
};
