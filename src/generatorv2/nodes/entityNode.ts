import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { makeFindQueryName } from '../codegen/names.js';
import { EntityName } from './entityName.js';
import { columnTypeToGqlPrimitive } from '../scripts/columnToGqlType.js';
import { GQLPrimitive } from '../scripts/gqlTypes.js';
import { nonNullable } from '../../runtime/util.js';
import { GQLQuery } from '../../migration/data/GQLOption.js';
import { MutationNode } from './mutationNode.js';
import { makeEntityMutationNodes } from '../parser/makeMutationNodes.js';
import { ReferencedNode, ReferenceNode } from './ReferencedNode.js';
import {
  FieldNode,
  makeCreatableFieldNode,
  makeFieldNode,
  makeUpdatableFieldNode,
} from './FieldNode.js';

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

type SubTypeNode = {
  gqlEnabled: boolean;
  fields: FieldNode[];
};

type FindMethodNode = {
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
