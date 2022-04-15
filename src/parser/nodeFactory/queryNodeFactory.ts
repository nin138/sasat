import { lowercaseFirstLetter, plural } from '../../util/stringUtil.js';
import { QueryNode } from '../node/gql/queryNode.js';
import { TypeNode } from '../node/typeNode.js';
import { ParameterNode } from '../node/parameterNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { FindMethodNode } from '../node/findMethod.js';

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
