import { plural } from '../../util/stringUtil';
import { QueryNode } from '../node/gql/queryNode';
import { TypeNode } from '../node/typeNode';
import { ParameterNode } from '../node/parameterNode';
import { Parser } from '../parser';
import { TableHandler } from '../../migration/serializable/table';

export class QueryNodeFactory {
  create(table: TableHandler): QueryNode[] {
    return [this.primaryQuery(table), this.listQuery(table)];
  }

  private listQuery(table: TableHandler) {
    return new QueryNode(plural(table.tableName), 'find2', [], new TypeNode(table.getEntityName(), true, false));
  }

  private primaryQuery(table: TableHandler) {
    return new QueryNode(
      table.tableName,
      Parser.paramsToQueryName(...table.primaryKey),
      table.primaryKey.map(it => new ParameterNode(it, new TypeNode(table.column(it)!.dataType(), false, false))),
      new TypeNode(table.getEntityName(), false, true),
    );
  }
}
