import { IrGqlResolver } from '../../ir/gql/resolver';
import { ReferenceColumn } from '../../entity/referenceColumn';
import { capitalizeFirstLetter } from '../../util/stringUtil';
import { Parser } from '../parser';
import { TableHandler } from '../../entity/table';

export class GqlResolverParser {
  private createChildResolver(
    ref: ReferenceColumn,
    tableName: string,
  ): IrGqlResolver {
    return {
      __type: 'child',
      currentEntity: TableHandler.tableNameToEntityName(tableName),
      currentColumn: ref.data.columnName,
      parentEntity: capitalizeFirstLetter(ref.data.targetTable),
      parentColumn: ref.data.targetColumn,
      gqlReferenceName: ref.data.relationName || ref.table.tableName,
      functionName: Parser.paramsToQueryName(ref.data.columnName),
    };
  }

  private createParentResolver(
    ref: ReferenceColumn,
    tableName: string,
  ): IrGqlResolver {
    return {
      __type: 'parent',
      currentEntity: capitalizeFirstLetter(ref.data.targetTable),
      currentColumn: ref.data.targetColumn,
      parentEntity: TableHandler.tableNameToEntityName(tableName),
      parentColumn: ref.data.columnName,
      gqlReferenceName: ref.data.targetTable,
      functionName: Parser.paramsToQueryName(ref.data.columnName),
    };
  }
  parse(table: TableHandler): IrGqlResolver[] {
    return table
      .getReferenceColumns()
      .flatMap(it => [
        this.createChildResolver(it, table.tableName),
        this.createParentResolver(it, table.tableName),
      ]);
  }
}
