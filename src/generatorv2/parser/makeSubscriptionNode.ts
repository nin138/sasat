import type { GQLMutation } from "../../migration/data/GQLOption.js";
import type { DataStoreHandler } from "../../migration/dataStore.js";
import type { TableHandler } from "../../migration/serializable/table.js";
import { nonNullable } from "../../runtime/util.js";
import { getHashId } from "../nodes/FieldNode.js";
import type {
  SubscriptionFilterNode,
  SubscriptionNode,
} from "../nodes/subscriptionNode.js";

export const makeSubscriptionNodes = (
  store: DataStoreHandler,
): SubscriptionNode[] => {
  return store.tables
    .flatMap((table) => {
      return table.gqlOption.mutations.map((it) => {
        return makeSubscriptionNode(store, table, it);
      });
    })
    .filter(nonNullable);
};

const subscriptionNamePostfix = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

const makeSubscriptionNode = (
  store: DataStoreHandler,
  table: TableHandler,
  mutation: GQLMutation,
): SubscriptionNode | null => {
  if (!mutation.subscription.enabled) return null;
  const subscriptionName =
    table.getEntityName().name + subscriptionNamePostfix[mutation.type];
  const filters: SubscriptionFilterNode[] =
    mutation.subscription.subscriptionFilter.map((argument) => {
      const column = table.column(argument);
      const hashId = getHashId(store, table.getEntityName(), column);
      return {
        field: column.fieldName(),
        argument,
        gqlType: hashId ? "ID" : column.gqlType(),
        hashId,
      };
    });
  return {
    subscriptionName,
    entity: table.getEntityName(),
    publishFunctionName: "publish" + subscriptionName,
    returnType: {
      typeName: table.getEntityName().name,
      nullable: false,
      array: false,
      entity: true,
    },
    args: filters.map((filter) => ({
      name: filter.argument,
      type: {
        typeName: filter.gqlType,
        dbType: table.column(filter.argument).dataType(),
        nullable: false,
        array: false,
        entity: false,
      },
    })),
    filters,
    mutationType: mutation.type,
    gqlEnabled: table.gqlOption.enabled && mutation.subscription.enabled,
  };
};
