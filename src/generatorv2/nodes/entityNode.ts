import { EntityName } from '../../parser/node/entityName.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { GqlPrimitive } from '../../generator/gql/types.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { Table, TableHandler } from '../../migration/serializable/table.js';
import {
  BaseColumn,
  ReferenceColumn,
} from '../../migration/serializable/column.js';
import { nonNullableFilter } from '../../util/type.js';
import { Relation } from '../../migration/data/relation.js';
import { SerializedColumn } from '../../migration/serialized/serializedColumn.js';
import { makeFindQueryName } from '../codegen/names.js';
import { columnTypeToGqlPrimitive } from '../../generator/gql/columnToGqlType.js';

const makeFieldNode = (column: BaseColumn): FieldNode => ({
  fieldName: column.fieldName(),
  columnName: column.columnName(),
  gqlType: column.gqlType(),
  dbType: column.dataType(),
  isAutoIncrement: column.data.autoIncrement,
  isArray: false,
  isPrimary: column.isPrimary(),
  isNullable: column.isNullable(),
  isUpdatable: !(column.data.onUpdateCurrentTimeStamp || column.isPrimary()), // TODO impl non updatable column
  isGQLOpen: !column.table.gqlOption.mutation.fromContextColumns.some(
    it => it.column === column.columnName(),
  ),
  column: column.data,
});

const makeCreatableFieldNode = (column: BaseColumn): FieldNode | null => {
  if (column.data.autoIncrement || column.data.defaultCurrentTimeStamp)
    return null;
  return {
    fieldName: column.fieldName(),
    columnName: column.columnName(),
    gqlType: column.gqlType(),
    dbType: column.dataType(),
    isAutoIncrement: column.data.autoIncrement,
    isArray: false,
    isPrimary: column.isPrimary(),
    isNullable: column.isNullableOnCreate(),
    isUpdatable: column.isUpdatable(),
    isGQLOpen: !column.table.gqlOption.mutation.fromContextColumns.some(
      it => it.column === column.columnName(),
    ),
    column: column.data,
  };
};

const makeUpdatableFieldNode = (column: BaseColumn): FieldNode | null => {
  if (!column.isUpdatable()) return null;
  return {
    fieldName: column.fieldName(),
    columnName: column.columnName(),
    gqlType: column.gqlType(),
    dbType: column.dataType(),
    isAutoIncrement: column.data.autoIncrement,
    isArray: false,
    isNullable: true,
    isPrimary: false,
    isUpdatable: true,
    isGQLOpen: !column.table.gqlOption.mutation.fromContextColumns.some(
      it => it.column === column.columnName(),
    ),
    column: column.data,
  };
};

export class EntityNode {
  readonly name: EntityName;
  readonly tableName: string;
  readonly fields: FieldNode[];
  readonly creatable: SubTypeNode;
  readonly updateInput: SubTypeNode;
  readonly gqlEnabled: boolean;
  readonly identifyKeys: string[];
  readonly references: ReferenceNode[];
  readonly referencedBy: ReferencedNode[];
  readonly findMethods: FindMethodNode[];
  constructor(store: DataStoreHandler, table: TableHandler) {
    this.fields = table.columns.map(makeFieldNode);
    this.name = EntityName.fromTableName(table.tableName);
    this.tableName = table.tableName;
    this.gqlEnabled = table.gqlOption.enabled;
    this.identifyKeys = table.primaryKey;
    this.creatable = {
      gqlEnabled:
        table.gqlOption.enabled && table.gqlOption.mutation.create.enabled,
      fields: table.columns
        .map(makeCreatableFieldNode)
        .filter(nonNullableFilter),
    };
    this.updateInput = {
      gqlEnabled:
        table.gqlOption.enabled && table.gqlOption.mutation.update.enabled,
      fields: [
        ...this.fields.filter(it => it.isPrimary),
        ...table.columns.map(makeUpdatableFieldNode).filter(nonNullableFilter),
      ],
    };
    this.references = table
      .getReferenceColumns()
      .map(
        column =>
          new ReferenceNode(
            this,
            column,
            store.table(column.data.reference.targetTable),
          ),
      );
    this.referencedBy = store
      .referencedBy(table.tableName)
      .map(column => new ReferencedNode(this, table, column));

    const makeFindMethodNode = (
      columns: string[],
      isArray: boolean,
    ): FindMethodNode => {
      const fields = columns.map(
        column => this.fields.find(it => it.columnName === column)!,
      );
      return {
        name: makeFindQueryName(fields.map(it => it.fieldName)),
        params: fields.map(it =>
          makePrimitiveParameterNode(it.fieldName, it.columnName, it.dbType),
        ),
        isArray,
      };
    };

    this.findMethods = [
      makeFindMethodNode(table.primaryKey, false),
      ...this.references.map(ref => {
        const parent = store.table(ref.parentTableName);
        return {
          name: makeFindQueryName([parent.getEntityName().name]),
          params: [
            makeEntityParameterNode(
              parent.getEntityName(),
              parent.getPrimaryKeyColumns().map(it => ({
                entity: false,
                fieldName: it.fieldName(),
                columnName: it.columnName(),
                dbtype: it.dataType(),
                gqltype: it.gqlType(),
              })),
            ),
          ],
          isArray: false,
        };
      }),
      ...this.referencedBy.map(ref => {
        const child = store.table(ref.childTable);
        return {
          name: makeFindQueryName([child.getEntityName().name]),
          params: [
            makeEntityParameterNode(
              child.getEntityName(),
              child.getPrimaryKeyColumns().map(it => ({
                entity: false,
                fieldName: it.fieldName(),
                columnName: it.columnName(),
                dbtype: it.dataType(),
                gqltype: it.gqlType(),
              })),
            ),
          ],
          isArray: ref.relation === 'Many',
        };
      }),
    ];
  }
}

const makeParentFieldName = (column: ReferenceColumn) => {
  return (
    (column.data.reference.relationName || '') +
    EntityName.fromTableName(column.table.tableName).name
  );
};
const makeChildFieldName = (column: ReferenceColumn) => {
  return (
    column.data.reference.relationName ||
    column.fieldName() +
      EntityName.fromTableName(column.data.reference.targetTable).name
  );
};

export class ReferenceNode {
  readonly parentTableName: string;
  readonly parentColumnName: string;
  readonly parentFieldName: string;
  readonly tableName: string;
  readonly columnName: string;
  readonly isArray: boolean;
  readonly isGQLOpen: boolean;
  readonly isNullable: boolean;
  readonly isPrimary: boolean;
  readonly fieldName: string;

  constructor(
    readonly entity: EntityNode,
    column: ReferenceColumn,
    parentTable: Table,
  ) {
    const ref = column.data.reference;
    this.isGQLOpen =
      column.table.gqlOption.enabled && parentTable.gqlOption.enabled;
    this.isPrimary = column.isPrimary();
    this.isArray = false;
    this.isNullable = false;
    this.parentTableName = ref.targetTable;
    this.parentColumnName = ref.targetColumn;
    this.tableName = column.table.tableName;
    this.columnName = column.columnName();
    this.fieldName = makeChildFieldName(column);
    this.parentFieldName = makeParentFieldName(column);
  }
}

export class ReferencedNode {
  readonly childTable: string;
  readonly childColumn: string;
  readonly childFieldName: string;
  readonly columnName: string;
  readonly fieldName: string;
  readonly isGQLOpen: boolean;
  readonly isPrimary: boolean;
  readonly isArray: boolean;
  readonly isNullable: boolean;
  readonly relation: Relation;

  constructor(
    readonly entity: EntityNode,
    parentTable: TableHandler,
    column: ReferenceColumn,
  ) {
    const ref = column.data.reference;
    this.childTable = column.table.tableName;
    this.childColumn = column.columnName();
    this.columnName = column.data.reference.targetColumn;
    this.childFieldName = makeChildFieldName(column);
    this.fieldName = makeParentFieldName(column);
    this.isGQLOpen =
      parentTable.gqlOption.enabled && column.table.gqlOption.enabled;
    this.isPrimary = column.isPrimary();
    this.isArray = ref.relation === 'Many';
    this.isNullable = ref.relation === 'OneOrZero';
    this.relation = ref.relation;
    // requiredOnCreate: ref.relation === 'OneOrZero', TODO add to creatable
  }
}

export type SubTypeNode = {
  gqlEnabled: boolean;
  fields: FieldNode[];
};

export type FieldNode = {
  fieldName: string;
  columnName: string;
  gqlType: GqlPrimitive | string;
  dbType: DBColumnTypes;
  isNullable: boolean;
  isArray: boolean;
  isPrimary: boolean;
  isUpdatable: boolean;
  isGQLOpen: boolean;
  isAutoIncrement: boolean;
  column: SerializedColumn;
};

export type FindMethodNode = {
  name: string;
  params: ParameterNode[];
  isArray: boolean;
};

type ParameterNode = EntityParameterNode | PrimitiveParameterNode;

type EntityParameterNode = {
  entity: true;
  name: string;
  entityName: EntityName;
  fields: PrimitiveParameterNode[];
};

const makeEntityParameterNode = (
  entityName: EntityName,
  fields: PrimitiveParameterNode[],
): EntityParameterNode => ({
  entity: true,
  name: entityName.lowerCase(),
  entityName,
  fields,
});

type PrimitiveParameterNode = {
  entity: false;
  fieldName: string;
  columnName: string;
  dbtype: DBColumnTypes;
  gqltype: GqlPrimitive;
};

const makePrimitiveParameterNode = (
  fieldName: string,
  columnName: string,
  dbtype: DBColumnTypes,
): PrimitiveParameterNode => ({
  entity: false,
  fieldName,
  columnName,
  dbtype,
  gqltype: columnTypeToGqlPrimitive(dbtype),
});
