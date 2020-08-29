import { IrGqlParam, IrGqlType } from '../../ir/gql/types';
import { ReferenceColumn } from '../../entity/referenceColumn';
import { TableHandler } from '../../entity/table';
import { Column } from '../../entity/column';
import { columnTypeToGqlPrimitive } from '../../generator/gql/columnToGqlType';
import { capitalizeFirstLetter } from '../../util/stringUtil';
import { DataStoreHandler } from '../../entity/dataStore';
import { Relation } from '../..';
import { TypeDefNode } from '../../node/gql/typeDefNode';
import { Parser } from '../parser';
import { EntityNode } from '../../node/entity';
import { ParameterNode } from '../../node/parameterNode';
import { TypeNode } from '../../node/typeNode';

export class GqlTypeParser {
  private columnToParam = (column: Column): IrGqlParam => ({
    name: column.name,
    type: columnTypeToGqlPrimitive(column.type),
    isNullable: column.isNullable(),
    isArray: false,
    isReference: false,
  });

  private static referenceToParam(ref: ReferenceColumn): IrGqlParam {
    return {
      name: ref.data.relationName || capitalizeFirstLetter(ref.data.targetTable),
      type: capitalizeFirstLetter(ref.data.targetTable),
      isNullable: false,
      isArray: false,
      isReference: true,
    };
  }

  private getReferencedType = (store: DataStoreHandler, tableName: string): IrGqlParam[] =>
    store.referencedBy(tableName).map(it => ({
      name: it.table.getEntityName().name,
      type: it.table.getEntityName().name,
      isNullable: it.data.relation === Relation.OneOrZero,
      isArray: it.data.relation === Relation.Many,
      isReference: true,
    }));

  // static getType(table: TableHandler) {
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   const entity = Parser.tableToEntityNode(null as any, table);
  //   return new TypeDefNode(
  //     table.getEntityName().name,
  //     entity.fields.map(it => it.toParam()),
  //   );
  // }

  static getType2(table: TableHandler, entity: EntityNode) {
    const reference = entity.relations.map(rel => new ParameterNode(rel.toEntityName.name, rel.refType()));
    const referencedBy = entity
      .findReferencedRelations()
      .map(rel => new ParameterNode(rel.parent.entityName.name, rel.referenceByType()));

    return new TypeDefNode(table.getEntityName().name, [
      ...entity.fields.map(it => it.toParam()),
      ...reference,
      ...referencedBy,
    ]);
  }

  static getDeletedType(table: TableHandler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entity = Parser.tableToEntityNode(null as any, table);
    return new TypeDefNode(
      `Deleted${table.getEntityName()}`,
      entity.identifiableFields().map(it => it.toParam()),
    );
    // return {
    //   typeName: `Deleted${table.getEntityName()}`,
    //   params: [
    //     ...table.columns.filter(column => table.isColumnPrimary(column.name)).map(this.columnToParam),
    //     ...table.columns
    //       .filter(it => it.isReference())
    //       .map(it => GqlTypeParser.referenceToParam(it as ReferenceColumn)),
    //   ],
    // };
  }
}
