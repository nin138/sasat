import { TableHandler } from '../../migration/serializable/table.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { ContextField, MutationNode } from '../nodes/mutationNode.js';
import { GqlFromContextParam } from '../../migration/data/GQLOption.js';
import { EntityNode } from '../nodes/entityNode.js';

export const makeEntityMutationNodes = (
  table: TableHandler,
  entity: EntityNode,
): MutationNode[] => {
  const result: MutationNode[] = [];
  if (!table.gqlOption.enabled) return [];
  if (table.gqlOption.mutation.create.enabled)
    result.push(makeCreateMutationNode(table, entity));
  if (table.gqlOption.mutation.update.enabled)
    result.push(makeUpdateMutationNode(table, entity));
  if (table.gqlOption.mutation.delete.enabled)
    result.push(makeDeleteMutationNode(table, entity));
  return result;
};

const makeContextField = (params: GqlFromContextParam): ContextField => ({
  fieldName: params.column,
  contextName: params.contextName || params.column,
});

const makeCreateMutationNode = (
  table: TableHandler,
  entity: EntityNode,
): MutationNode => {
  return {
    entity,
    contextFields:
      table.gqlOption.mutation.fromContextColumns.map(makeContextField),
    entityName: table.getEntityName(),
    identifyFields: table.getPrimaryKeyColumns().map(it => it.fieldName()),
    mutationName: `create${table.getEntityName().name}`,
    inputName: entity.name.createInputName(),
    refetch: !table.gqlOption.mutation.create.noReFetch,
    returnType: {
      typeName: table.getEntityName().name,
      nullable: false,
      array: false,
      entity: true,
    },
    args: [
      {
        name: table.getEntityName().lowerCase(),
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
    requireIdDecodeMiddleware: entity.creatable.fields.some(it => it.hashId),
  };
};

const makeUpdateMutationNode = (
  table: TableHandler,
  entity: EntityNode,
): MutationNode => {
  const noRefetch = table.gqlOption.mutation.update.noReFetch;
  return {
    entity,
    contextFields:
      table.gqlOption.mutation.fromContextColumns.map(makeContextField),
    entityName: table.getEntityName(),
    identifyFields: table.getPrimaryKeyColumns().map(it => it.fieldName()),
    mutationName: `update${table.getEntityName().name}`,
    inputName: entity.name.updateInputName(),
    refetch: !table.gqlOption.mutation.update.noReFetch,
    returnType: {
      typeName: noRefetch ? 'Boolean' : table.getEntityName().name,
      dbType: noRefetch
        ? DBColumnTypes.boolean
        : (undefined as unknown as DBColumnTypes),
      nullable: false,
      array: false,
      entity: !noRefetch,
    },
    args: [
      {
        name: table.getEntityName().lowerCase(),
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
    requireIdDecodeMiddleware: entity.updateInput.fields.some(it => it.hashId),
  };
};

const makeDeleteMutationNode = (
  table: TableHandler,
  entity: EntityNode,
): MutationNode => {
  return {
    entity,
    mutationName: `delete${table.getEntityName().name}`,
    inputName: entity.name.identifyInputName(),
    contextFields:
      table.gqlOption.mutation.fromContextColumns.map(makeContextField),
    entityName: table.getEntityName(),
    identifyFields: table.getPrimaryKeyColumns().map(it => it.fieldName()),
    refetch: false,
    returnType: {
      typeName: 'Boolean',
      dbType: DBColumnTypes.boolean,
      nullable: false,
      array: false,
      entity: false,
    },
    args: [
      {
        name: table.getEntityName().lowerCase(),
        type: {
          typeName: table.getEntityName().updateInputName(),
          nullable: false,
          array: false,
          entity: true,
        },
      },
    ],
    mutationType: 'delete',
    subscription: table.gqlOption.mutation.update.subscription,
    requireIdDecodeMiddleware: entity.identifyFields().some(it => it.hashId),
  };
};
