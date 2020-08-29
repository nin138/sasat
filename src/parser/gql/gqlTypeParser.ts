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

export class GqlTypeParser {
  parse(store: DataStoreHandler): TypeDefNode[] {
    return store.tables.flatMap(it => [this.getType(it), this.getDeletedType(it)]);
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

  private getType(table: TableHandler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entity = Parser.tableToEntityNode(null as any, table);
    return new TypeDefNode(
      table.getEntityName().name,
      entity.fields.map(it => it.toParam()),
    );
  }

  private getDeletedType(table: TableHandler) {
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
