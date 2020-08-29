import { IrGqlQuery, IrGqlQueryType } from '../../ir/gql/query';
import { capitalizeFirstLetter, plural } from '../../util/stringUtil';
import { TableHandler } from '../../entity/table';
import { QueryNode } from '../../node/gql/queryNode';
import { TypeNode } from '../../node/typeNode';
import { ParameterNode } from '../../node/parameterNode';

export class QueryParser {
  parse(tables: TableHandler[]): QueryNode[] {
    return tables.flatMap(it => [this.listQuery(it), this.primaryQuery(it)]);
  }

  private listQuery(table: TableHandler) {
    return new QueryNode(plural(table.tableName), [], new TypeNode(table.getEntityName(), true, false));
  }

  private primaryQuery(table: TableHandler) {
    return new QueryNode(
      table.tableName,
      table.primaryKey.map(it => new ParameterNode(it, new TypeNode(table.column(it)!.type, false, false))),
      new TypeNode(table.getEntityName(), false, true),
    );
  }
}

export class GqlQueryParser {
  parse(tables: TableHandler[]): IrGqlQuery[] {
    return [...this.listQuery(tables), ...this.primaryQuery(tables)];
  }

  private listQuery(tables: TableHandler[]): IrGqlQuery[] {
    return tables.map(it => ({
      queryName: plural(it.tableName),
      queryType: IrGqlQueryType.List,
      entity: it.getEntityName().name,
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
      entity: table.getEntityName().name,
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
