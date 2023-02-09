import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { Table, TableHandler } from '../../migration/serializable/table.js';
import {
  BaseColumn,
  ReferenceColumn,
} from '../../migration/serializable/column.js';
import {
  ColumnOptions,
  SerializedColumn,
} from '../../migration/serialized/serializedColumn.js';
import { makeFindQueryName } from '../codegen/names.js';
import { EntityName } from './entityName.js';
import { columnTypeToGqlPrimitive } from '../scripts/columnToGqlType.js';
import { GQLPrimitive } from '../scripts/gqlTypes.js';
import { VirtualRelation } from '../../migration/data/virtualRelation.js';
import {
  JoinConditionNode,
  JoinConditionValue,
  JoinConditionRangeValue,
} from './JoinConditionNode.js';
import { nonNullable } from '../../runtime/util.js';
import { Conditions } from '../../migration/makeCondition.js';
import { GQLQuery } from '../../migration/data/GQLOption.js';
import { MutationNode } from './mutationNode.js';
import { makeEntityMutationNodes } from '../parser/makeMutationNodes.js';

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

const makeFieldNode = (
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

const makeCreatableFieldNode = (
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

const makeUpdatableFieldNode = (
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
  readonly queries: GQLQuery[];
  readonly mutations: MutationNode[];
  constructor(store: DataStoreHandler, table: TableHandler) {
    this.name = EntityName.fromTableName(table.tableName);
    this.fields = table.columns.map(it => makeFieldNode(store, this, it));
    this.tableName = table.tableName;
    this.gqlEnabled = table.gqlOption.enabled;
    this.identifyKeys = table.primaryKey;
    this.queries = table.gqlOption.queries;
    this.creatable = {
      gqlEnabled:
        table.gqlOption.enabled &&
        table.gqlOption.mutations.find(it => it.type === 'create') !==
          undefined,
      fields: table.columns
        .map(it => makeCreatableFieldNode(store, this, it))
        .filter(nonNullable),
    };
    this.updateInput = {
      gqlEnabled:
        table.gqlOption.enabled &&
        table.gqlOption.mutations.find(it => it.type === 'update') !==
          undefined,
      fields: [
        ...this.fields.filter(it => it.isPrimary),
        ...table.columns
          .map(it => makeUpdatableFieldNode(store, this, it))
          .filter(nonNullable),
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
        table.virtualRelations.map(it =>
          ReferenceNode.formVirtualRelation(store, this, it),
        ),
      )
      .filter(nonNullable);
    this.referencedBy = store
      .referencedBy(table.tableName)
      .map(column => ReferencedNode.fromReference(this, table, column))
      .concat(
        store
          .virtualReferencedBy(table.tableName)
          .map(rel => ReferencedNode.fromVirtualRelation(store, this, rel)),
      )
      .filter(nonNullable);

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
      // TODO findBy relations
    ];

    this.mutations = makeEntityMutationNodes(table, this);
  }
  // end constructor

  identifyFields() {
    return this.fields.filter(it => it.isPrimary);
  }

  primaryQueryName() {
    return makeFindQueryName(this.identifyFields().map(it => it.fieldName));
  }
}

const makeJoinCondition = (
  parentColumn: string,
  childColumn: string,
): JoinConditionNode[] => {
  return [
    Conditions.rel.comparison(
      Conditions.value.parent(parentColumn),
      '=',
      Conditions.value.child(childColumn),
    ),
  ];
};

export class ReferenceNode {
  static fromReference(
    entity: EntityNode,
    column: ReferenceColumn,
    parentTable: Table,
  ) {
    const ref = column.data.reference;
    if (!ref.fieldName) return null;
    return new ReferenceNode(
      entity,
      ref.fieldName,
      column.table.tableName,
      ref.parentTable,
      makeJoinCondition(ref.parentColumn, column.columnName()),
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
    if (!rel.childFieldName) return null;
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
    readonly joinCondition: JoinConditionNode[],
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
    if (!ref.parentFieldName) return null;
    return new ReferencedNode(
      entity,
      ref.parentFieldName,
      column.table.tableName,
      makeJoinCondition(column.columnName(), ref.parentColumn),
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
    if (!rel.parentFieldName) return null;
    return new ReferencedNode(
      entity,
      rel.parentFieldName,
      rel.childTable,
      rel.conditions.map(reverseConditionNode),
      rel.parentType === undefined || rel.parentType === 'array',
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
    readonly joinCondition: JoinConditionNode[],
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

type PrimitiveParameterNode = {
  entity: false;
  fieldName: string;
  columnName: string;
  dbtype: DBColumnTypes;
  gqltype: GQLPrimitive;
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

const reverseConditionValue = (cv: JoinConditionValue): JoinConditionValue => {
  if (cv.kind === 'parent') {
    return {
      ...cv,
      kind: 'child',
    };
  } else if (cv.kind === 'child') {
    return {
      ...cv,
      kind: 'parent',
    };
  }
  return cv;
};

const reverseRangeCondition = (
  condition: JoinConditionRangeValue,
): JoinConditionRangeValue => {
  if (condition.kind === 'range') {
    return {
      kind: condition.kind,
      begin: reverseConditionValue(condition.begin),
      end: reverseConditionValue(condition.end),
    };
  }
  return condition;
};

const reverseConditionNode = (
  condition: JoinConditionNode,
): JoinConditionNode => {
  if (condition.kind === 'custom')
    return {
      ...condition,
      parentRequiredFields: condition.childRequiredFields,
      childRequiredFields: condition.parentRequiredFields,
    };
  if (condition.operator === 'BETWEEN') {
    return Conditions.rel.between(
      reverseConditionValue(condition.left),
      reverseRangeCondition(condition.right),
    );
  }
  return Conditions.rel.comparison(
    reverseConditionValue(condition.right),
    condition.operator,
    reverseConditionValue(condition.left),
  );
};
