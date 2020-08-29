import { DataStoreHandler } from '../entity/dataStore';
import { GqlResolverParser } from './gql/gqlResolverParser';
import { ContextNode } from '../node/gql/contextNode';
import { TypeNode } from '../node/typeNode';
import { ResolverNode } from '../node/gql/resolverNode';
import { TableHandler } from '../entity/table';
import { GqlNode } from '../node/rootNode';

export class GqlParser {
  parse(store: DataStoreHandler): GqlNode {
    return {
      resolvers: this.getResolvers(store),
    };
  }

  getContext(tables: TableHandler[]): ContextNode[] {
    const obj: Record<string, ContextNode> = {};
    tables.forEach(table =>
      table.gqlOption.mutation.fromContextColumns.forEach(it => {
        const name = it.contextName || it.column;
        obj[name] = new ContextNode(name, new TypeNode(table.column(it.column)!.type, false, false));
      }),
    );
    return Object.values(obj);
  }

  private getResolvers(store: DataStoreHandler): ResolverNode[] {
    return new GqlResolverParser().parse(store.tables);
  }
}
