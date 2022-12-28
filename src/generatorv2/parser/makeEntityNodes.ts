import { DataStoreHandler } from '../../migration/dataStore.js';
import { TableHandler } from '../../migration/serializable/table.js';
import {
  EntityNode,
  FieldNode,
  ReferenceTypeNode,
} from '../nodes/entityNode.js';
import {
  BaseColumn,
  ReferenceColumn,
} from '../../migration/serializable/column.js';
import { nonNullableFilter } from '../../util/type.js';
import { EntityName } from '../../parser/node/entityName.js';

export const makeEntityNodes = (store: DataStoreHandler) => {
  const make = makeEntityNode(store);
  return store.tables.map(make);
};

const makeEntityNode =
  (store: DataStoreHandler) =>
  (table: TableHandler): EntityNode => {
    const makeReference = makeReferenceFieldNode(store);
    const makeReferenced = makeReferencedFieldNode(store);
    const fields = table.columns.map(makeFieldNode);
    return {
      name: EntityName.fromTableName(table.tableName),
      gqlEnabled: table.gqlOption.enabled,
      fields,
      references: table.getReferenceColumns().map(makeReference),
      referencedBy: store.referencedBy(table.tableName).map(makeReferenced),
      creatable: {
        gqlEnabled:
          table.gqlOption.enabled && table.gqlOption.mutation.create.enabled,
        fields: table.columns
          .map(makeCreatableFieldNode)
          .filter(nonNullableFilter),
      },
      updateInput: {
        gqlEnabled:
          table.gqlOption.enabled && table.gqlOption.mutation.update.enabled,
        fields: [
          ...fields.filter(it => !it.isUpdatable),
          ...table.columns
            .map(makeUpdatableFieldNode)
            .filter(nonNullableFilter),
        ],
      },
    };
  };

const makeFieldNode = (column: BaseColumn): FieldNode => ({
  name: column.fieldName(),
  gqlType: column.gqlType(),
  dbType: column.dataType(),
  isArray: false,
  isPrimary: column.isPrimary(),
  isNullable: column.isNullable(),
  isUpdatable: !(column.data.onUpdateCurrentTimeStamp || column.isPrimary()), // TODO impl non updatable column
});

const makeReferenceFieldNode =
  (_: DataStoreHandler) =>
  (column: ReferenceColumn): ReferenceTypeNode => {
    return {
      entity: EntityName.fromTableName(column.table.tableName),
      gqlEnabled: column.table.gqlOption.enabled,
      isPrimary: column.isPrimary(),
      isArray: false,
      isNullable: false,
    };
  };

const makeReferencedFieldNode =
  (store: DataStoreHandler) =>
  (column: ReferenceColumn): ReferenceTypeNode => {
    const ref = column.data.reference;
    return {
      entity: EntityName.fromTableName(ref.targetTable),
      gqlEnabled: store.table(ref.targetTable).gqlOption.enabled,
      isPrimary: column.isPrimary(),
      isArray: ref.relation === 'Many',
      isNullable: ref.relation === 'OneOrZero',
      // requiredOnCreate: ref.relation === 'OneOrZero', TODO add to creatable
    };
  };

const makeCreatableFieldNode = (column: BaseColumn): FieldNode | null => {
  if (column.data.autoIncrement || column.data.defaultCurrentTimeStamp)
    return null;
  return {
    name: column.fieldName(),
    gqlType: column.gqlType(),
    dbType: column.dataType(),
    isArray: false,
    isPrimary: column.isPrimary(),
    isNullable: column.isNullableOnCreate(),
    isUpdatable: column.isUpdatable(),
  };
};

const makeUpdatableFieldNode = (column: BaseColumn): FieldNode | null => {
  if (!column.isUpdatable()) return null;
  return {
    name: column.fieldName(),
    gqlType: column.gqlType(),
    dbType: column.dataType(),
    isArray: false,
    isNullable: true,
    isPrimary: false,
    isUpdatable: true,
  };
};
