import { EntityName } from '../../parser/node/entityName.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { GqlPrimitive } from '../../generator/gql/types.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { TableHandler } from '../../migration/serializable/table.js';
import {
  BaseColumn,
  ReferenceColumn,
} from '../../migration/serializable/column.js';
import { nonNullableFilter } from '../../util/type.js';
import { Relation } from '../../migration/data/relation.js';

const makeFieldNode = (column: BaseColumn): FieldNode => ({
  fieldName: column.fieldName(),
  columnName: column.columnName(),
  gqlType: column.gqlType(),
  dbType: column.dataType(),
  isArray: false,
  isPrimary: column.isPrimary(),
  isNullable: column.isNullable(),
  isUpdatable: !(column.data.onUpdateCurrentTimeStamp || column.isPrimary()), // TODO impl non updatable column
  isGQLOpen: !column.table.gqlOption.mutation.fromContextColumns.some(
    it => it.column === column.columnName(),
  ),
});

const makeCreatableFieldNode = (column: BaseColumn): FieldNode | null => {
  if (column.data.autoIncrement || column.data.defaultCurrentTimeStamp)
    return null;
  return {
    fieldName: column.fieldName(),
    columnName: column.columnName(),
    gqlType: column.gqlType(),
    dbType: column.dataType(),
    isArray: false,
    isPrimary: column.isPrimary(),
    isNullable: column.isNullableOnCreate(),
    isUpdatable: column.isUpdatable(),
    isGQLOpen: !column.table.gqlOption.mutation.fromContextColumns.some(
      it => it.column === column.columnName(),
    ),
  };
};

const makeUpdatableFieldNode = (column: BaseColumn): FieldNode | null => {
  if (!column.isUpdatable()) return null;
  return {
    fieldName: column.fieldName(),
    columnName: column.columnName(),
    gqlType: column.gqlType(),
    dbType: column.dataType(),
    isArray: false,
    isNullable: true,
    isPrimary: false,
    isUpdatable: true,
    isGQLOpen: column.table.gqlOption.mutation.fromContextColumns.some(
      it => it.column === column.columnName(),
    ),
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
        ...this.fields.filter(it => !it.isUpdatable),
        ...table.columns.map(makeUpdatableFieldNode).filter(nonNullableFilter),
      ],
    };
    this.references = table
      .getReferenceColumns()
      .map(column => new ReferenceNode(this, column));
    this.referencedBy = store
      .referencedBy(table.tableName)
      .map(column => new ReferencedNode(this, table, column));
  }
}

export class ReferenceNode {
  readonly parentTableName: string;
  readonly parentColumnName: string;
  readonly tableName: string;
  readonly columnName: string;
  readonly isArray: boolean;
  readonly isGQLOpen: boolean;
  readonly isNullable: boolean;
  readonly isPrimary: boolean;
  readonly fieldName: string;

  constructor(readonly entity: EntityNode, column: ReferenceColumn) {
    const ref = column.data.reference;
    this.isGQLOpen = column.table.gqlOption.enabled;
    this.isPrimary = column.isPrimary();
    this.isArray = false;
    this.isNullable = false;
    this.parentTableName = ref.targetTable;
    this.parentColumnName = ref.targetColumn;
    this.tableName = column.table.tableName;
    this.columnName = column.columnName();
    this.fieldName =
      ref.relationName ||
      column.fieldName() + EntityName.fromTableName(ref.targetTable).name;
  }
}

export class ReferencedNode {
  readonly childTable: string;
  readonly childColumn: string;
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
    this.fieldName =
      (ref.relationName || '') + parentTable.getEntityName().name;
    this.isGQLOpen = parentTable.gqlOption.enabled;
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
};
