import { DataStoreHandler } from '../entity/dataStore';
import { GqlMutationParser } from './gql/gqlMutationParser';
import { QueryParser } from './gql/gqlQueryParser';
import { GqlResolverParser } from './gql/gqlResolverParser';
import { MutationNode } from '../node/gql/mutationNode';
import { ContextNode } from '../node/gql/contextNode';
import { TypeNode } from '../node/typeNode';
import { ResolverNode } from '../node/gql/resolverNode';
import { TableHandler } from '../entity/table';
import { GqlNode } from '../node/rootNode';

export class GqlParser {
  parse(store: DataStoreHandler): GqlNode {
    return {
      queries: new QueryParser().parse(store.tables),
      mutations: this.getMutations(store),
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

  private getMutations(store: DataStoreHandler): MutationNode[] {
    return store.tables.flatMap(new GqlMutationParser().parse);
  }

  private getResolvers(store: DataStoreHandler): ResolverNode[] {
    return new GqlResolverParser().parse(store.tables);
  }
}
