import { TableHandler } from '../../migration/serializable/table.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { ContextField, MutationNode } from '../nodes/mutationNode.js';
import {
  GqlFromContextParam,
  GQLMutation,
} from '../../migration/data/GQLOption.js';
import { EntityNode } from '../nodes/entityNode.js';
import { TypeNode } from '../nodes/typeNode.js';

export const makeEntityMutationNodes = (
  table: TableHandler,
  entity: EntityNode,
): MutationNode[] => {
  if (!table.gqlOption.enabled) return [];
  return table.gqlOption.mutations.map(mutation => {
    switch (mutation.type) {
      case 'create':
        return makeCreateMutationNode(table, entity, mutation);
      case 'update':
        return makeUpdateMutationNode(table, entity, mutation);
      case 'delete':
        return makeDeleteMutationNode(table, entity, mutation);
    }
  });
};

const makeContextField = (params: GqlFromContextParam): ContextField => ({
  fieldName: params.column,
  contextName: params.contextName || params.column,
});

const makeCreateMutationNode = (
  table: TableHandler,
  entity: EntityNode,
  mutation: GQLMutation,
): MutationNode => {
  return {
    entity,
    contextFields: mutation.contextFields.map(makeContextField),
    entityName: table.getEntityName(),
    identifyFields: table.getPrimaryKeyColumns().map(it => it.fieldName()),
    mutationName: `create${table.getEntityName().name}`,
    inputName: entity.name.createInputName(),
    refetch: !mutation.noReFetch,
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
    subscription: mutation.subscription.enabled,
    requireIdDecodeMiddleware: entity.creatable.fields.some(it => it.hashId),
    middlewares: mutation.middlewares,
  };
};

const makeUpdateMutationNode = (
  table: TableHandler,
  entity: EntityNode,
  mutation: GQLMutation,
): MutationNode => {
  return {
    entity,
    contextFields: mutation.contextFields.map(makeContextField),
    entityName: table.getEntityName(),
    identifyFields: table.getPrimaryKeyColumns().map(it => it.fieldName()),
    mutationName: `update${table.getEntityName().name}`,
    inputName: entity.name.updateInputName(),
    refetch: !mutation.noReFetch,
    returnType: {
      typeName: mutation.noReFetch ? 'Boolean' : table.getEntityName().name,
      dbType: mutation.noReFetch
        ? DBColumnTypes.boolean
        : (undefined as unknown as DBColumnTypes),
      nullable: false,
      array: false,
      entity: !mutation.noReFetch,
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
    subscription: mutation.subscription.enabled,
    requireIdDecodeMiddleware: entity.updateInput.fields.some(it => it.hashId),
    middlewares: mutation.middlewares,
  };
};

const makeDeleteMutationNode = (
  table: TableHandler,
  entity: EntityNode,
  mutation: GQLMutation,
): MutationNode => {
  return {
    entity,
    mutationName: `delete${table.getEntityName().name}`,
    inputName: entity.name.identifyInputName(),
    contextFields: mutation.contextFields.map(makeContextField),
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
          typeName: table.getEntityName().identifyInputName(),
          nullable: false,
          array: false,
          entity: true,
        },
      },
    ],
    mutationType: 'delete',
    subscription: mutation.subscription.enabled,
    requireIdDecodeMiddleware: entity.identifyFields().some(it => it.hashId),
    middlewares: mutation.middlewares,
  };
};
