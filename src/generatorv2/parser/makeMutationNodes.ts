import { DataStoreHandler } from '../../migration/dataStore.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { GqlPrimitive } from '../../generator/gql/types.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { ContextField, MutationNode } from '../nodes/mutationNode.js';
import { GqlFromContextParam } from '../../migration/data/GQLOption.js';

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

const makeContextField = (params: GqlFromContextParam): ContextField => ({
  fieldName: params.column,
  contextName: params.contextName || params.column,
});

const makeCreateMutationNode = (table: TableHandler): MutationNode => {
  return {
    contextFields:
      table.gqlOption.mutation.fromContextColumns.map(makeContextField),
    entityName: table.getEntityName(),
    identifyFields: table.getPrimaryKeyColumns().map(it => it.fieldName()),
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
    subscription: table.gqlOption.mutation.create.subscription,
  };
};

const makeUpdateMutationNode = (table: TableHandler): MutationNode => {
  const noRefetch = table.gqlOption.mutation.update.noReFetch;
  return {
    contextFields:
      table.gqlOption.mutation.fromContextColumns.map(makeContextField),
    entityName: table.getEntityName(),
    identifyFields: table.getPrimaryKeyColumns().map(it => it.fieldName()),
    mutationName: `update${table.getEntityName().name}`,
    refetch: !table.gqlOption.mutation.update.noReFetch,
    returnType: {
      typeName: noRefetch ? GqlPrimitive.Boolean : table.getEntityName().name,
      dbType: noRefetch
        ? DBColumnTypes.boolean
        : (undefined as unknown as DBColumnTypes),
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
    subscription: table.gqlOption.mutation.update.subscription,
  };
};

const makeDeleteMutationNode = (table: TableHandler): MutationNode => {
  return {
    mutationName: `delete${table.getEntityName().name}`,
    contextFields:
      table.gqlOption.mutation.fromContextColumns.map(makeContextField),
    entityName: table.getEntityName(),
    identifyFields: table.getPrimaryKeyColumns().map(it => it.fieldName()),
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
    subscription: table.gqlOption.mutation.update.subscription,
  };
};
