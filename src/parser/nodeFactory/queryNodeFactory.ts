import { lowercaseFirstLetter, plural } from '../../util/stringUtil.js';
import {ListQueryType, QueryNode} from '../node/gql/queryNode.js';
import {
  EntityTypeNode,
  ListQueryOptionTypeNode,
} from '../node/typeNode.js';
import { ParameterNode } from '../node/parameterNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { FindMethodNode } from '../node/findMethod.js';
import {GQLOption} from "../../migration/data/GQLOption.js";

export class QueryNodeFactory {
  create(table: TableHandler, gqlOption: GQLOption): QueryNode[] {
    if(!gqlOption.enabled) return [];
    const result = [];
    if(gqlOption.query.find) {
      result.push(this.primaryQuery(table))
    }
    if(gqlOption.query.list !== false) {
      result.push(this.listQuery(table, gqlOption.query.list));
    }
    return  result;
  }

  private listQuery(table: TableHandler, listQueryType: ListQueryType) {
    return new QueryNode(
      lowercaseFirstLetter(plural(table.getEntityName().name)),
      'find',
      listQueryType === 'paging' ? [new ParameterNode('option', new ListQueryOptionTypeNode())] : [],
      new EntityTypeNode(table.getEntityName(), true, false),
      true,
      listQueryType,
    );
  }

  private primaryQuery(table: TableHandler) {
    const primaryKeys = table.primaryKey.map(it =>
      table.column(it).fieldName(),
    );
    return new QueryNode(
      lowercaseFirstLetter(table.getEntityName().name),
      FindMethodNode.paramsToName(...primaryKeys),
      table.primaryKey.map(
        it =>
          new ParameterNode(
            table.column(it).fieldName(),
            new EntityTypeNode(table.column(it)!.dataType(), false, false),
          ),
      ),
      new EntityTypeNode(table.getEntityName(), false, true),
      false,
    );
  }
}
