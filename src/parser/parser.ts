import { capitalizeFirstLetter } from '../util/stringUtil';
import { Relation } from '..';
import { RepositoryNode } from './node/repositoryNode';
import { FindMethodNode } from './node/findMethod';
import { ParameterNode } from './node/parameterNode';
import { TypeNode } from './node/typeNode';
import { RootNode } from './node/rootNode';
import { TableHandler } from '../migration/serializable/table';
import { ReferenceColumn } from '../migration/serializable/column';
import { DataStoreHandler } from '../migration/dataStore';
import { EntityName } from './node/entityName';

export class Parser {
  parse(store: DataStoreHandler): RootNode {
    const root = new RootNode(store);
    const repositories = store.tables.map(it => new RepositoryNode(root, it, this.getQueries(it)));
    root.addRepository(...repositories);
    return root;
  }

  static paramsToQueryName(...params: string[]): string {
    return 'findBy' + params.map(capitalizeFirstLetter).join('And');
  }

  private createPrimaryQuery(table: TableHandler): FindMethodNode {
    return new FindMethodNode(
      Parser.paramsToQueryName(...table.primaryKey),
      table.primaryKey.map(it => {
        const column = table.column(it)!;
        return new ParameterNode(it, new TypeNode(column.dataType(), false, false));
      }),
      new TypeNode(table.getEntityName(), false, true),
      true,
    );
  }

  private createRefQuery(ref: ReferenceColumn): FindMethodNode {
    return new FindMethodNode(
      Parser.paramsToQueryName(ref.columnName()),
      [new ParameterNode(ref.columnName(), new TypeNode(ref.dataType(), false, false))],
      new TypeNode(EntityName.fromTableName(ref.table.tableName), ref.data.reference.relation === Relation.Many, false),
      false,
    );
  }

  private getQueries(table: TableHandler): FindMethodNode[] {
    const methods: FindMethodNode[] = [];
    if (table.primaryKey.length > 0 || !table.column(table.primaryKey[0])!.isReference()) {
      methods.push(this.createPrimaryQuery(table));
    }
    methods.push(
      ...table.columns.filter(column => column.isReference()).map(it => this.createRefQuery(it as ReferenceColumn)),
    );
    return methods;
  }
}
