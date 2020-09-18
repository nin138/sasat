import { lowercaseFirstLetter, plural } from '../../util/stringUtil';
import { QueryNode } from '../node/gql/queryNode';
import { TypeNode } from '../node/typeNode';
import { ParameterNode } from '../node/parameterNode';
import { TableHandler } from '../../migration/serializable/table';
import { FindMethodNode } from '../node/findMethod';

export class QueryNodeFactory {
  create(table: TableHandler): QueryNode[] {
    return [this.primaryQuery(table), this.listQuery(table)];
  }

  private listQuery(table: TableHandler) {
    return new QueryNode(
      lowercaseFirstLetter(plural(table.getEntityName().name)),
      'find',
      [],
      new TypeNode(table.getEntityName(), true, false),
    );
  }

  private primaryQuery(table: TableHandler) {
    const primaryKeys = table.primaryKey.map(it => table.column(it).fieldName());
    return new QueryNode(
      lowercaseFirstLetter(table.getEntityName().name),
      FindMethodNode.paramsToName(...primaryKeys),
      table.primaryKey.map(
        it => new ParameterNode(table.column(it).fieldName(), new TypeNode(table.column(it)!.dataType(), false, false)),
      ),
      new TypeNode(table.getEntityName(), false, true),
    );
  }
}
