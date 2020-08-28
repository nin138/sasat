import { IrGql } from '../ir/gql';
import { DataStoreHandler } from '../entity/dataStore';
import { IrGqlContext } from '../ir/gql/context';
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
    const a = {
      types: new GqlTypeParser().parse(this.store),
      queries: new GqlQueryParser().parse(this.store.tables),
      mutations: this.getMutations(),
      contexts: this.getContext().map(it => new ContextNode(it.name, new TypeNode(it.type, false, false))),
      resolvers: this.getResolvers(),
    };
    // console.log(a);
    return a;
  }

  private getContext(): IrGqlContext[] {
    const obj: Record<string, IrGqlContext> = {};
    this.store.tables.forEach(table =>
      table.gqlOption.mutation.fromContextColumns.forEach(it => {
        const name = it.contextName || it.column;
        obj[name] = {
          name,
          type: table.column(it.column)!.type,
        };
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
