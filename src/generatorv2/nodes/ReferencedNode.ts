import { Table, TableHandler } from '../../migration/serializable/table.js';
import { ReferenceColumn } from '../../migration/serializable/column.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { VirtualRelation } from '../../migration/data/virtualRelation.js';
import {
  JoinConditionNode,
  JoinConditionRangeValue,
  JoinConditionValue,
} from './JoinConditionNode.js';
import { EntityNode } from './entityNode.js';
import { Conditions } from '../../migration/makeCondition.js';

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
  if (condition.operator === 'IN') {
    return Conditions.rel.in(
      reverseConditionValue(condition.left),
      condition.right.map(reverseConditionValue),
    );
  }
  return Conditions.rel.comparison(
    reverseConditionValue(condition.right),
    condition.operator,
    reverseConditionValue(condition.left),
  );
};

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
