import { IrGql } from '../ir/gql';
import { DataStoreHandler } from '../entity/dataStore';
import { IrGqlMutation } from '../ir/gql/mutation';
import { IrGqlResolver } from '../ir/gql/resolver';
import { IrGqlContext } from '../ir/gql/context';
import { GqlMutationParser } from './gql/gqlMutationParser';
import { GqlQueryParser } from './gql/gqlQueryParser';
import { GqlTypeParser } from './gql/gqlTypeParser';
import { GqlResolverParser } from './gql/gqlResolverParser';

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

  private getContext(): IrGqlContext[] {
    return this.store.tables.flatMap(table =>
      table.gqlOption.mutation.fromContextColumns.map(it => ({
        name: it.contextName || it.column,
        type: table.column(it.column)!.type,
      })),
    );
  }

  private getMutations(): IrGqlMutation {
    return {
      entities: this.store.tables.map(new GqlMutationParser().parse),
    };
  }

  private getResolvers(): IrGqlResolver[] {
    return this.store.tables.flatMap(new GqlResolverParser().parse);
  }
}
