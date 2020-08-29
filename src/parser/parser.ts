import { DataStoreHandler } from '../entity/dataStore';
import { TableHandler } from '../entity/table';
import { capitalizeFirstLetter } from '../util/stringUtil';
import { ReferenceColumn } from '../entity/referenceColumn';
import { Relation } from '..';
import { RepositoryNode } from '../node/repositoryNode';
import { EntityNode } from '../node/entityNode';
import { FindMethodNode } from '../node/findMethod';
import { ParameterNode } from '../node/parameterNode';
import { TypeNode } from '../node/typeNode';
import { RootNode } from '../node/rootNode';
import { GqlParser } from './gqlParser';

export class Parser {
  constructor(private store: DataStoreHandler) {}
  parse(): RootNode {
    const root = new RootNode(new GqlParser().parse(this.store), new GqlParser().getContext(this.store.tables));
    const repositories = this.store.tables.map(it => new RepositoryNode(root, it, this.getQueries(it)));
    root.addRepository(...repositories);
    return root;
  }

  static paramsToQueryName(...params: string[]) {
    return 'findBy' + params.map(capitalizeFirstLetter).join('And');
  }

  private createPrimaryQuery(table: TableHandler): FindMethodNode {
    return new FindMethodNode(
      Parser.paramsToQueryName(...table.primaryKey),
      table.primaryKey.map(it => {
        const column = table.column(it)!;
        return new ParameterNode(it, new TypeNode(column.type, false, false));
      }),
      new TypeNode(table.getEntityName(), false, true),
      true,
    );
  }

  // TODO Remove
  public static tableToEntityNode(parent: RepositoryNode, table: TableHandler) {
    return new EntityNode(parent, table);
  }

  private createRefQuery(ref: ReferenceColumn): FindMethodNode {
    return new FindMethodNode(
      Parser.paramsToQueryName(ref.name),
      [new ParameterNode(ref.name, new TypeNode(ref.type, false, false))],
      new TypeNode(ref.table.getEntityName(), ref.data.relation === Relation.Many, false),
      false,
    );
  }

  private getQueries(table: TableHandler): FindMethodNode[] {
    const methods: FindMethodNode[] = [];
    if (table.primaryKey.length > 1 || !table.column(table.primaryKey[0])!.isReference()) {
      methods.push(this.createPrimaryQuery(table));
    }
    methods.push(
      ...table.columns.filter(column => column.isReference()).map(it => this.createRefQuery(it as ReferenceColumn)),
    );
    return methods;
  }
}
