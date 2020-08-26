import { ReferenceColumn } from '../../entity/referenceColumn';
import { Parser } from '../parser';
import { TableHandler } from '../../entity/table';
import { RelationNode, ResolverNode } from '../../node/gql/resolverNode';
import { EntityName } from '../../entity/entityName';

export class GqlResolverParser {
  parse = (tables: TableHandler[]): ResolverNode[] => {
    const relations = tables.flatMap(it => this.parseTable(it));
    const map: Record<string, RelationNode[]> = {};
    relations.forEach(it => {
      if (map[it.parentEntity.name]) {
        map[it.parentEntity.name].push(it);
      } else {
        map[it.parentEntity.name] = [it];
      }
    });

    return Object.entries(map).map(([key, values]) => new ResolverNode(new EntityName(key), values));
  };

  private parseTable(table: TableHandler): RelationNode[] {
    return table
      .getReferenceColumns()
      .flatMap(it => [this.createChildRelation(it, table.tableName), this.createParentRelation(it, table.tableName)]);
  }

  private createChildRelation(ref: ReferenceColumn, tableName: string): RelationNode {
    return new RelationNode(
      ref.data.relationName || ref.data.targetTable,
      new EntityName(TableHandler.tableNameToEntityName(tableName)),
      new EntityName(TableHandler.tableNameToEntityName(ref.data.targetTable)),
      Parser.paramsToQueryName(ref.data.targetColumn),
      [ref.data.columnName],
    );
  }

  private createParentRelation(ref: ReferenceColumn, tableName: string): RelationNode {
    const parentEntity = new EntityName(TableHandler.tableNameToEntityName(ref.data.targetTable));
    return new RelationNode(
      ref.table.getEntityName(),
      parentEntity,
      new EntityName(TableHandler.tableNameToEntityName(tableName)),
      Parser.paramsToQueryName(ref.name),
      [ref.data.targetColumn],
    );
  }
}
