import { lowercaseFirstLetter, plural } from '../../util/stringUtil.js';
import { QueryNode } from '../node/gql/queryNode.js';
import {EntityTypeNode, ListQueryOptionTypeNode, TypeNode} from '../node/typeNode.js';
import { ParameterNode } from '../node/parameterNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { FindMethodNode } from '../node/findMethod.js';
import {EntityName} from "../node/entityName.js";
import {TypeDefGenerator} from "../../generator/ts/gql/typeDefGenerator.js";

export class QueryNodeFactory {
  create(table: TableHandler): QueryNode[] {
    return [this.primaryQuery(table), this.listQuery(table)];
  }

  private listQuery(table: TableHandler) {
    return new QueryNode(
      lowercaseFirstLetter(plural(table.getEntityName().name)),
      'find',
      [
        new ParameterNode('option',
          new ListQueryOptionTypeNode(),
        )
      ],
      new EntityTypeNode(table.getEntityName(), true, false),
      true,
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
