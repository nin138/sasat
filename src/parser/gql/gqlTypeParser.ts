import { IrGqlParam, IrGqlType } from '../../ir/gql/types';
import { ReferenceColumn } from '../../entity/referenceColumn';
import { TableHandler } from '../../entity/table';
import { Column } from '../../entity/column';
import { columnTypeToGqlPrimitive } from '../../generator/gql/columnToGqlType';
import { capitalizeFirstLetter } from '../../util/stringUtil';
import { Relation } from 'sasat';
import { DataStoreHandler } from '../../entity/dataStore';

export class GqlTypeParser {
  parse(store: DataStoreHandler): IrGqlType[] {
    return store.tables.flatMap(it => [
      this.getType(store, it),
      this.getDeletedType(it),
    ]);
  }

  private columnToParam = (column: Column): IrGqlParam => ({
    name: column.name,
    type: columnTypeToGqlPrimitive(column.type),
    isNullable: column.isNullable(),
    isArray: false,
    isReference: false,
  });

  private static referenceToParam(ref: ReferenceColumn): IrGqlParam {
    return {
      name: ref.data.relationName || ref.data.targetTable,
      type: capitalizeFirstLetter(ref.data.targetTable),
      isNullable: false,
      isArray: false,
      isReference: true,
    };
  }

  private getReferencedType = (
    store: DataStoreHandler,
    tableName: string,
  ): IrGqlParam[] =>
    store.referencedBy(tableName).map(it => ({
      name: it.table.tableName,
      type: it.table.getEntityName(),
      isNullable: it.data.relation === Relation.OneOrZero,
      isArray: it.data.relation === Relation.Many,
      isReference: true,
    }));

  private getType(store: DataStoreHandler, table: TableHandler) {
    return {
      typeName: table.getEntityName(),
      params: [
        ...table.columns.map(this.columnToParam),
        ...table.columns
          .filter(it => it.isReference())
          .map(it => GqlTypeParser.referenceToParam(it as ReferenceColumn)),
        ...this.getReferencedType(store, table.tableName),
      ],
    };
  }

  private getDeletedType(table: TableHandler) {
    return {
      typeName: `Deleted${table.getEntityName()}`,
      params: [
        ...table.columns
          .filter(column => table.isColumnPrimary(column.name))
          .map(this.columnToParam),
        ...table.columns
          .filter(it => it.isReference())
          .map(it => GqlTypeParser.referenceToParam(it as ReferenceColumn)),
      ],
    };
  }
}
