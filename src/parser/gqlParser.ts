import { IrGql } from '../ir/gql';
import { DataStoreHandler } from '../entity/dataStore';
import { GqlMutationParser } from './gql/gqlMutationParser';
import { GqlQueryParser } from './gql/gqlQueryParser';
import { GqlTypeParser } from './gql/gqlTypeParser';
import { GqlResolverParser } from './gql/gqlResolverParser';
import { MutationNode } from '../node/gql/mutationNode';
import { ContextNode } from '../node/gql/contextNode';
import { TypeNode } from '../node/typeNode';
import { ResolverNode } from '../node/gql/resolverNode';

export class GqlParser {
  constructor(private store: DataStoreHandler) {}
  parse(): IrGql {
    return {
      types: new GqlTypeParser().parse(this.store),
      queries: new GqlQueryParser().parse(this.store.tables),
      mutations: this.getMutations(),
      contexts: this.getContext(),
      resolvers: this.getResolvers(),
    };
  }

  private getContext(): ContextNode[] {
    const obj: Record<string, ContextNode> = {};
    this.store.tables.forEach(table =>
      table.gqlOption.mutation.fromContextColumns.forEach(it => {
        const name = it.contextName || it.column;
        obj[name] = new ContextNode(name, new TypeNode(table.column(it.column)!.type, false, false));
      }),
    );
    return Object.values(obj);
  }

  private getMutations(): MutationNode[] {
    return this.store.tables.flatMap(new GqlMutationParser().parse);
  }

  private getResolvers(): ResolverNode[] {
    return new GqlResolverParser().parse(this.store.tables);
  }
}
