import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { Table, TableHandler } from '../../migration/serializable/table.js';
import {
  BaseColumn,
  ReferenceColumn,
} from '../../migration/serializable/column.js';
import { nonNullableFilter } from '../../util/type.js';
import { SerializedColumn } from '../../migration/serialized/serializedColumn.js';
import { makeFindQueryName } from '../codegen/names.js';
import { EntityName } from './entityName.js';
import { columnTypeToGqlPrimitive } from '../scripts/columnToGqlType.js';
import { GqlPrimitive } from '../scripts/gqlTypes.js';
import { VirtualRelation } from '../../migration/data/virtualRelation.js';
import { ConditionNode } from './ConditionNode.js';
import { nonNullable } from '../../runtime/util.js';

const makeFieldNode = (column: BaseColumn): FieldNode => ({
  fieldName: column.fieldName(),
  columnName: column.columnName(),
  gqlType: column.gqlType(),
  dbType: column.dataType(),
  isAutoIncrement: column.data.autoIncrement,
  isArray: false,
  isPrimary: column.isPrimary(),
  isNullable: column.isNullable(),
  isUpdatable:
    !(column.data.onUpdateCurrentTimeStamp || column.isPrimary()) &&
    column.data.option.updatable,
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
  if (!column.isUpdatable() || !column.data.option.updatable) return null;
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
      .map(column =>
        ReferenceNode.fromReference(
          this,
          column,
          store.table(column.data.reference.parentTable),
        ),
      )
      .concat(
        table.virtualRelations
          .map(it => ReferenceNode.formVirtualRelation(store, this, it))
          .filter(nonNullable),
      );
    this.referencedBy = store
      .referencedBy(table.tableName)
      .map(column => ReferencedNode.fromReference(this, table, column))
      .concat(
        store
          .virtualReferencedBy(table.tableName)
          .map(rel => ReferencedNode.fromVirtualRelation(store, this, rel)),
      )
      .filter(nonNullableFilter);

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
      // TODO impl relationMap.where and rm duplicate and use Field name
      // ...this.references.map(ref => {
      //   const parent = store.table(ref.parentTableName);
      //   return {
      //     name: makeFindQueryName([parent.getEntityName().name]),
      //     params: [
      //       makeEntityParameterNode(
      //         parent.getEntityName(),
      //         parent.getPrimaryKeyColumns().map(it => ({
      //           entity: false,
      //           fieldName: it.fieldName(),
      //           columnName: it.columnName(),
      //           dbtype: it.dataType(),
      //           gqltype: it.gqlType(),
      //         })),
      //       ),
      //     ],
      //     isArray: false,
      //   };
      // }),
      // ...this.referencedBy.map(ref => {
      //   const child = store.table(ref.childTable);
      //   return {
      //     name: makeFindQueryName([child.getEntityName().name]),
      //     params: [
      //       makeEntityParameterNode(
      //         child.getEntityName(),
      //         child.getPrimaryKeyColumns().map(it => ({
      //           entity: false,
      //           fieldName: it.fieldName(),
      //           columnName: it.columnName(),
      //           dbtype: it.dataType(),
      //           gqltype: it.gqlType(),
      //         })),
      //       ),
      //     ],
      //     isArray: ref.relation === 'Many',
      //   };
      // }),
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
      EntityName.fromTableName(column.data.reference.parentTable).name
  );
};

const makeJoinCondition = (
  parentColumn: string,
  childColumn: string,
): ConditionNode[] => {
  return [
    {
      left: { type: 'parent', field: parentColumn },
      right: { type: 'child', field: childColumn },
      operator: '=',
    },
  ];
};

export class ReferenceNode {
  static fromReference(
    entity: EntityNode,
    column: ReferenceColumn,
    parentTable: Table,
  ) {
    const ref = column.data.reference;
    return new ReferenceNode(
      entity,
      ref.fieldName || makeChildFieldName(column),
      column.table.tableName,
      ref.parentTable,
      makeJoinCondition(column.columnName(), ref.parentColumn),
      false,
      false,
      column.isPrimary(),
      column.table.gqlOption.enabled && parentTable.gqlOption.enabled,
    );
  }
  static formVirtualRelation(
    ds: DataStoreHandler,
    entity: EntityNode,
    rel: VirtualRelation,
  ) {
    if (rel.childFieldName === false) return null;
    return new ReferenceNode(
      entity,
      rel.childFieldName,
      rel.childTable,
      rel.parentTable,
      rel.conditions,
      rel.childType === undefined || rel.childType === 'array',
      rel.childType === 'nullable',
      false,
      ds.table(rel.parentTable).gqlOption.enabled &&
        ds.table(rel.childTable).gqlOption.enabled,
    );
  }

  private constructor(
    readonly entity: EntityNode,
    readonly fieldName: string,
    readonly tableName: string,
    readonly parentTableName: string,
    readonly joinCondition: ConditionNode[],
    readonly isArray: boolean,
    readonly isNullable: boolean,
    readonly isPrimary: boolean,
    readonly isGQLOpen: boolean,
  ) {}
}

export class ReferencedNode {
  static fromReference(
    entity: EntityNode,
    parentTable: TableHandler,
    column: ReferenceColumn,
  ) {
    const ref = column.data.reference;
    if (ref.parentFieldName === false) return null;
    return new ReferencedNode(
      entity,
      column.data.reference.parentFieldName || makeParentFieldName(column),
      column.table.tableName,
      makeJoinCondition(ref.parentColumn, column.columnName()),
      ref.relation === 'Many',
      ref.relation === 'OneOrZero',
      column.isPrimary(),
      parentTable.gqlOption.enabled && column.table.gqlOption.enabled,
    );
    // requiredOnCreate: ref.relation === 'OneOrZero', TODO add to creatable
  }

  static fromVirtualRelation(
    ds: DataStoreHandler,
    entity: EntityNode,
    rel: VirtualRelation,
  ) {
    if (rel.parentFieldName === false) return null;
    return new ReferencedNode(
      entity,
      rel.parentFieldName,
      rel.childTable,
      rel.conditions,
      rel.parentType === 'array',
      rel.parentType === 'nullable',
      false,
      ds.table(rel.parentTable).gqlOption.enabled &&
        ds.table(rel.childTable).gqlOption.enabled,
    );
  }

  private constructor(
    readonly entity: EntityNode,
    readonly fieldName: string,
    readonly childTable: string,
    readonly joinCondition: ConditionNode[],
    readonly isArray: boolean,
    readonly isNullable: boolean,
    readonly isPrimary: boolean,
    readonly isGQLOpen: boolean,
  ) {}
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
