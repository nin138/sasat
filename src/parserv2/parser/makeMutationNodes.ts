import { DataStoreHandler } from '../../migration/dataStore.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { MutationNode } from '../nodes/mutationNode.js';
import { GqlPrimitive } from '../../generator/gql/types.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';

export const makeMutationNodes = (store: DataStoreHandler) => {
  return store.tables.flatMap(makeTableMutationNodes);
};

const makeTableMutationNodes = (table: TableHandler): MutationNode[] => {
  const result: MutationNode[] = [];
  if (!table.gqlOption.enabled) return [];
  if (table.gqlOption.mutation.create.enabled)
    result.push(makeCreateMutationNode(table));
  if (table.gqlOption.mutation.update.enabled)
    result.push(makeUpdateMutationNode(table));
  if (table.gqlOption.mutation.delete.enabled)
    result.push(makeDeleteMutationNode(table));
  return result;
};

const makeCreateMutationNode = (table: TableHandler): MutationNode => {
  return {
    mutationName: `create${table.getEntityName().name}`,
    refetch: !table.gqlOption.mutation.create.noReFetch,
    returnType: {
      typeName: table.getEntityName().name,
      nullable: false,
      array: false,
      entity: true,
    },
    args: [
      {
        name: table.getEntityName().name,
        type: {
          typeName: table.getEntityName().createInputName(),
          nullable: false,
          array: false,
          entity: true,
        },
      },
    ],
    mutationType: 'create',
    enableSubscription: table.gqlOption.mutation.create.subscription,
  };
};

const makeUpdateMutationNode = (table: TableHandler): MutationNode => {
  const noRefetch = table.gqlOption.mutation.update.noReFetch;
  return <MutationNode>{
    mutationName: `update${table.getEntityName().name}`,
    refetch: !table.gqlOption.mutation.update.noReFetch,
    returnType: {
      typeName: noRefetch ? GqlPrimitive.Boolean : table.getEntityName().name,
      dbType: noRefetch ? DBColumnTypes.boolean : undefined,
      nullable: false,
      array: false,
      entity: !noRefetch,
    },
    args: [
      {
        name: table.getEntityName().name,
        type: {
          typeName: table.getEntityName().updateInputName(),
          nullable: false,
          array: false,
          entity: true,
        },
      },
    ],
    mutationType: 'update',
    enableSubscription: table.gqlOption.mutation.update.subscription,
  };
};

const makeDeleteMutationNode = (table: TableHandler): MutationNode => {
  return {
    mutationName: `delete${table.getEntityName().name}`,
    refetch: false,
    returnType: {
      typeName: GqlPrimitive.Boolean,
      dbType: DBColumnTypes.boolean,
      nullable: false,
      array: false,
      entity: false,
    },
    args: [
      {
        name: table.getEntityName().name,
        type: {
          typeName: table.getEntityName().updateInputName(),
          nullable: false,
          array: false,
          entity: true,
        },
      },
    ],
    mutationType: 'update',
    enableSubscription: table.gqlOption.mutation.update.subscription,
  };
};
