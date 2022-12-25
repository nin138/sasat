import { DataStoreHandler } from '../../migration/dataStore.js';
import { Table, TableHandler } from '../../migration/serializable/table.js';
import {
  EntityNode,
  FieldNode,
  ReferenceTypeNode,
} from '../nodes/entityNode.js';
import {
  BaseColumn,
  ReferenceColumn,
} from '../../migration/serializable/column.js';
import { tableNameToEntityName } from '../utils.js';

export const createEntityNodes = (store: DataStoreHandler) => {
  const create = createEntityNode(store);
  return store.tables.map(create);
};

const createEntityNode =
  (store: DataStoreHandler) =>
  (table: TableHandler): EntityNode => {
    const createReference = createReferenceFieldNode(store);
    const createReferenced = createReferencedFieldNode(store);
    return {
      gqlEnabled: table.gqlOption.enabled,
      fields: table.columns.map(createFieldNode),
      references: table.getReferenceColumns().map(createReference),
      referencedBy: store.referencedBy(table.tableName).map(createReferenced),
    };
  };

const createFieldNode = (column: BaseColumn): FieldNode => ({
  gqlType: column.gqlType(),
  dbType: column.dataType(),
  isArray: false,
  isPrimary: column.isPrimary(),
  isNullable: column.isNullable(),
  requiredOnCreate:
    !column.isNullable() &&
    !column.data.default &&
    !column.data.autoIncrement &&
    !column.data.defaultCurrentTimeStamp,
});

const createReferenceFieldNode =
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
        requiredOnCreate: false,
      },
    };
  };

const createReferencedFieldNode =
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
        requiredOnCreate: ref.relation === 'OneOrZero',
      },
    };
  };
