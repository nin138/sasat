import { IrGqlQuery, IrGqlQueryType } from '../../ir/gql/query';
import { capitalizeFirstLetter, plural } from '../../util/stringUtil';
import { TableHandler } from '../../entity/table';

export class GqlQueryParser {
  parse(tables: TableHandler[]): IrGqlQuery[] {
    return [...this.listQuery(tables), ...this.primaryQuery(tables)];
  }

  private listQuery(tables: TableHandler[]): IrGqlQuery[] {
    return tables.map(it => ({
      queryName: plural(it.tableName),
      queryType: IrGqlQueryType.List,
      entity: it.getEntityName(),
      params: [],
      repositoryFunctionName: 'list',
      isArray: true,
      isNullable: false,
    }));
  }

  private primaryQuery(tables: TableHandler[]): IrGqlQuery[] {
    return tables.map(table => ({
      queryName: table.tableName,
      queryType: IrGqlQueryType.Primary,
      entity: table.getEntityName(),
      params: table.primaryKey.map(it => ({
        name: it,
        type: table.column(it)!.gqlType(),
        isNullable: false,
        isArray: false,
        isReference: false,
      })),
      repositoryFunctionName: 'findBy' + table.primaryKey.map(capitalizeFirstLetter).join('And'),
      isArray: false,
      isNullable: true,
    }));
  }
}
