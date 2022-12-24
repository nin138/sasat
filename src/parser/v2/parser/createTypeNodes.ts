import { DataStoreHandler } from '../../../migration/dataStore.js';
import { TableHandler } from '../../../migration/serializable/table.js';
import { TypeNode, FieldNode, ReferenceTypeNode } from '../nodes/TypeNode.js';
import {
  BaseColumn,
  ReferenceColumn,
} from '../../../migration/serializable/column.js';
import { tableNameToEntityName } from '../../nodeFactory/utils.js';

export const createTypeNodes = (store: DataStoreHandler) => {
  const create = createTypeNode(store);
  return store.tables.map(create);
};

const createTypeNode =
  (store: DataStoreHandler) =>
  (table: TableHandler): TypeNode => {
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
        isArray: ref.relation === 'Many',
        isNullable: ref.relation === 'OneOrZero',
        requiredOnCreate: ref.relation === 'OneOrZero',
      },
    };
  };
