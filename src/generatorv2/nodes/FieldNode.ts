import { GQLPrimitive } from '../scripts/gqlTypes.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import {
  ColumnOptions,
  SerializedColumn,
} from '../../migration/serialized/serializedColumn.js';
import { EntityNode } from './entityNode.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { BaseColumn } from '../../migration/serializable/column.js';
import { EntityName } from './entityName.js';

export type FieldNode = {
  entity: EntityNode;
  fieldName: string;
  columnName: string;
  gqlType: GQLPrimitive | string;
  dbType: DBColumnTypes;
  isNullable: boolean;
  isArray: boolean;
  isPrimary: boolean;
  isUpdatable: boolean;
  isGQLOpen: boolean;
  isAutoIncrement: boolean;
  column: SerializedColumn;
  option: ColumnOptions;
  hashId?: {
    encoder: string;
  };
};

const getHashId = (
  store: DataStoreHandler,
  entity: EntityName,
  column: BaseColumn,
): FieldNode['hashId'] => {
  if (!column.isReference()) {
    if (column.data.option.autoIncrementHashId)
      return { encoder: entity.IDEncoderName() };
    return undefined;
  }
  const ref = column.data.reference;
  const parent = store.table(ref.parentTable);
  if (!parent.column(ref.parentColumn).data.option.autoIncrementHashId)
    return undefined;
  return {
    encoder: parent.getEntityName().IDEncoderName(),
  };
};

export const makeFieldNode = (
  store: DataStoreHandler,
  entity: EntityNode,
  column: BaseColumn,
): FieldNode => {
  const hashId = getHashId(store, entity.name, column);
  return {
    entity,
    fieldName: column.fieldName(),
    columnName: column.columnName(),
    gqlType: hashId ? 'ID' : column.gqlType(),
    dbType: column.dataType(),
    isAutoIncrement: column.data.autoIncrement,
    isArray: false,
    isPrimary: column.isPrimary(),
    isNullable: column.isNullable(),
    isUpdatable:
      !(column.data.onUpdateCurrentTimeStamp || column.isPrimary()) &&
      column.data.option.updatable,
    isGQLOpen: true,
    column: column.data,
    option: column.data.option,
    hashId,
  };
};

export const makeCreatableFieldNode = (
  store: DataStoreHandler,
  entity: EntityNode,
  column: BaseColumn,
): FieldNode | null => {
  if (column.data.autoIncrement || column.data.defaultCurrentTimeStamp)
    return null;
  const hashId = getHashId(store, entity.name, column);
  return {
    entity,
    fieldName: column.fieldName(),
    columnName: column.columnName(),
    gqlType: hashId ? 'ID' : column.gqlType(),
    dbType: column.dataType(),
    isAutoIncrement: column.data.autoIncrement,
    isArray: false,
    isPrimary: column.isPrimary(),
    isNullable: column.isNullableOnCreate(),
    isUpdatable: column.isUpdatable(),
    isGQLOpen: !(
      column.table.gqlOption.mutations.find(it => it.type === 'create')
        ?.contextFields || []
    ).some(it => it.column === column.columnName()),
    column: column.data,
    option: column.data.option,
    hashId: getHashId(store, entity.name, column),
  };
};

export const makeUpdatableFieldNode = (
  store: DataStoreHandler,
  entity: EntityNode,
  column: BaseColumn,
): FieldNode | null => {
  if (!column.isUpdatable() || !column.data.option.updatable) return null;
  const hashId = getHashId(store, entity.name, column);
  return {
    entity,
    fieldName: column.fieldName(),
    columnName: column.columnName(),
    gqlType: hashId ? 'ID' : column.gqlType(),
    dbType: column.dataType(),
    isAutoIncrement: column.data.autoIncrement,
    isArray: false,
    isNullable: true,
    isPrimary: false,
    isUpdatable: true,
    isGQLOpen: !(
      column.table.gqlOption.mutations.find(it => it.type === 'update')
        ?.contextFields || []
    ).some(it => it.column === column.columnName()),
    column: column.data,
    option: column.data.option,
    hashId: getHashId(store, entity.name, column),
  };
};
