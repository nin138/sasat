import { DataStoreHandler } from '../../migration/dataStore.js';
import { SubscriptionNode } from '../nodes/subscriptionNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { GQLMutation } from '../../migration/data/GQLOption.js';
import { nonNullable } from '../../runtime/util.js';

export const makeSubscriptionNodes = (
  store: DataStoreHandler,
): SubscriptionNode[] => {
  return store.tables
    .flatMap(table => {
      return table.gqlOption.mutations.map(it => {
        return makeSubscriptionNode(table, it);
      });
    })
    .filter(nonNullable);
};

const subscriptionNamePostfix = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

const makeSubscriptionNode = (
  table: TableHandler,
  mutation: GQLMutation,
): SubscriptionNode | null => {
  if (!mutation.subscription.enabled) return null;
  const subscriptionName =
    table.getEntityName().name + subscriptionNamePostfix[mutation.type];
  return {
    subscriptionName,
    entity: table.getEntityName(),
    publishFunctionName: 'publish' + subscriptionName,
    returnType: {
      typeName: table.getEntityName().name,
      nullable: false,
      array: false,
      entity: true,
    },
    args: mutation.subscription.subscriptionFilter.map(it => {
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
    filters: (mutation.subscription?.subscriptionFilter || []).map(it => {
      const column = table.column(it);
      return {
        field: column.fieldName(),
        gqlType: column.gqlType(),
      };
    }),
    mutationType: mutation.type,
    gqlEnabled: table.gqlOption.enabled && mutation.subscription.enabled,
  };
};
