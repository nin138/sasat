import { plural } from '../../util/stringUtil';
import { TableHandler } from '../../entity/table';
import { QueryNode } from '../../node/gql/queryNode';
import { TypeNode } from '../../node/typeNode';
import { ParameterNode } from '../../node/parameterNode';

export class QueryParser {
  queries(table: TableHandler) {
    return [this.listQuery(table), this.primaryQuery(table)];
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
