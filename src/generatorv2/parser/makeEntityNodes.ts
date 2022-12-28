import { DataStoreHandler } from '../../migration/dataStore.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { EntityNode } from '../nodes/entityNode.js';

export const makeEntityNodes = (store: DataStoreHandler) => {
  const make = makeEntityNode(store);
  return store.tables.map(make);
};

const makeEntityNode =
  (store: DataStoreHandler) =>
  (table: TableHandler): EntityNode => {
    return new EntityNode(store, table);
  };
// const makeReference = makeReferenceFieldNode(store);
// const makeReferenced = makeReferencedFieldNode(store);
// const fields = table.columns.map(makeFieldNode);
// return {
//   name: EntityName.fromTableName(table.tableName),
//   tableName: table.tableName,
//   gqlEnabled: table.gqlOption.enabled,
//   fields,
//   references: table.getReferenceColumns().map(makeReference),
//   referencedBy: store.referencedBy(table.tableName).map(it => makeReferenced(it, this)),
//   creatable: {
//     gqlEnabled:
//       table.gqlOption.enabled && table.gqlOption.mutation.create.enabled,
//     fields: table.columns
//       .map(makeCreatableFieldNode)
//       .filter(nonNullableFilter),
//   },
//   updateInput: {
//     gqlEnabled:
//       table.gqlOption.enabled && table.gqlOption.mutation.update.enabled,
//     fields: [
//       ...fields.filter(it => !it.isUpdatable),
//       ...table.columns
//         .map(makeUpdatableFieldNode)
//         .filter(nonNullableFilter),
//     ],
//   },
// };

// const makeFieldNode = (column: BaseColumn): FieldNode => ({
//   name: column.fieldName(),
//   gqlType: column.gqlType(),
//   dbType: column.dataType(),
//   isArray: false,
//   isPrimary: column.isPrimary(),
//   isNullable: column.isNullable(),
//   isUpdatable: !(column.data.onUpdateCurrentTimeStamp || column.isPrimary()), // TODO impl non updatable column
//   isGQLOpen: !column.table.gqlOption.mutation.fromContextColumns.some(
//     it => it.column === column.columnName(),
//   ),
// });
//
// const makeReferenceFieldNode =
//   (_: DataStoreHandler) =>
//   (column: ReferenceColumn): ReferenceNode => {
//     return {
//       entity: EntityName.fromTableName(column.table.tableName),
//       isGQLOpen: column.table.gqlOption.enabled,
//       isPrimary: column.isPrimary(),
//       isArray: false,
//       isNullable: false,
//     };
//   };
//
// const makeReferencedFieldNode =
//   (store: DataStoreHandler) =>
//   (column: ReferenceColumn, entity: EntityNode): ReferenceNode => {
//     const ref = column.data.reference;
//     return {
//       // entity: EntityName.fromTableName(ref.targetTable),
//       entity: EntityName.fromTableName(ref.targetTable),
//       isGQLOpen: store.table(ref.targetTable).gqlOption.enabled,
//       isPrimary: column.isPrimary(),
//       isArray: ref.relation === 'Many',
//       isNullable: ref.relation === 'OneOrZero',
//       // requiredOnCreate: ref.relation === 'OneOrZero', TODO add to creatable
//     };
//   };
//
// const makeCreatableFieldNode = (column: BaseColumn): FieldNode | null => {
//   if (column.data.autoIncrement || column.data.defaultCurrentTimeStamp)
//     return null;
//   return {
//     name: column.fieldName(),
//     gqlType: column.gqlType(),
//     dbType: column.dataType(),
//     isArray: false,
//     isPrimary: column.isPrimary(),
//     isNullable: column.isNullableOnCreate(),
//     isUpdatable: column.isUpdatable(),
//     isGQLOpen: !column.table.gqlOption.mutation.fromContextColumns.some(
//       it => it.column === column.columnName(),
//     ),
//   };
// };
//
// const makeUpdatableFieldNode = (column: BaseColumn): FieldNode | null => {
//   if (!column.isUpdatable()) return null;
//   return {
//     name: column.fieldName(),
//     gqlType: column.gqlType(),
//     dbType: column.dataType(),
//     isArray: false,
//     isNullable: true,
//     isPrimary: false,
//     isUpdatable: true,
//     isGQLOpen: column.table.gqlOption.mutation.fromContextColumns.some(
//       it => it.column === column.columnName(),
//     ),
//   };
// };
