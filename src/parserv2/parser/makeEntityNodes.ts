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
import { nonNullableFilter, tableNameToEntityName } from '../utils.js';

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
          ...fields.filter(it => it.isPrimary),
          ...table.columns
            .map(makeUpdatableFieldNode)
            .filter(nonNullableFilter),
        ],
      },
    };
  };

const makeFieldNode = (column: BaseColumn): FieldNode => ({
  gqlType: column.gqlType(),
  dbType: column.dataType(),
  isArray: false,
  isPrimary: column.isPrimary(),
  isNullable: column.isNullable(),
});

const makeReferenceFieldNode =
  (_: DataStoreHandler) =>
  (column: ReferenceColumn): ReferenceTypeNode => {
    const ref = column.data.reference;
    return {
      entity: tableNameToEntityName(column.table.tableName),
      gqlEnabled: column.table.gqlOption.enabled,
      field: {
        gqlType: tableNameToEntityName(ref.targetTable),
        isPrimary: column.isPrimary(),
        isArray: false,
        isNullable: false,
      },
    };
  };

const makeReferencedFieldNode =
  (store: DataStoreHandler) =>
  (column: ReferenceColumn): ReferenceTypeNode => {
    const ref = column.data.reference;
    return {
      entity: tableNameToEntityName(ref.targetTable),
      gqlEnabled: store.table(ref.targetTable).gqlOption.enabled,
      field: {
        gqlType: tableNameToEntityName(ref.targetTable),
        isPrimary: column.isPrimary(),
        isArray: ref.relation === 'Many',
        isNullable: ref.relation === 'OneOrZero',
        // requiredOnCreate: ref.relation === 'OneOrZero', TODO add to creatable
      },
    };
  };

const makeCreatableFieldNode = (column: BaseColumn): FieldNode | null => {
  if (column.data.autoIncrement || column.data.defaultCurrentTimeStamp)
    return null;
  return {
    gqlType: column.gqlType(),
    dbType: column.dataType(),
    isArray: false,
    isPrimary: column.isPrimary(),
    isNullable: column.isNullableOnCreate(),
  };
};

const makeUpdatableFieldNode = (column: BaseColumn): FieldNode | null => {
  if (column.isPrimary() || column.data.onUpdateCurrentTimeStamp) return null;
  return {
    gqlType: column.gqlType(),
    dbType: column.dataType(),
    isArray: false,
    isNullable: true,
    isPrimary: false,
  };
};
