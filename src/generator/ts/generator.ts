import { CodeGenerator } from '../generator';
import * as prettier from 'prettier';
import { EntityNode } from '../../node/entityNode';
import { RepositoryNode } from '../../node/repositoryNode';
import { RootNode } from '../../node/rootNode';
import { EntityGenerator } from './entityGenerator';
import { TypeDefGenerator } from './gql/typeDefGenerator';
import { QueryGenerator } from './gql/queryGenerator';
import { ResolverGenerator } from './gql/resolverGenerator';
import { MutationGenerator } from './gql/mutationGenerator';
import { SubscriptionGenerator } from './gql/subscriptionGenerator';
import { ContextGenerator } from './gql/contextGenerator';
import { GeneratedRepositoryGenerator } from './db/generatedRepositoryGenerator';
import { generateRepositoryString } from './db/repositoryGenerator';

export class TsCodeGenerator implements CodeGenerator {
  readonly fileExt = 'ts';

  private formatCode(code: string) {
    return prettier.format(code, { parser: 'typescript' });
  }

  generateEntity(entity: EntityNode): string {
    return new EntityGenerator(entity).generate().toString();
  }

  generateGeneratedRepository(repository: RepositoryNode): string {
    return new GeneratedRepositoryGenerator(repository).generate().toString();
  }

  generateRepository(repository: RepositoryNode): string {
    return this.formatCode(generateRepositoryString(repository));
  }

  generateGqlTypeDefs(root: RootNode): string {
    return new TypeDefGenerator().generate(root).toString();
  }

  generateGqlQuery(root: RootNode): string {
    return new QueryGenerator().generate(root.repositories).toString();
  }

  generateGqlResolver(root: RootNode): string {
    return new ResolverGenerator().generate(root.gql.resolvers).toString();
  }

  generateGqlMutation(root: RootNode): string {
    return new MutationGenerator().generate(root.mutations()).toString();
  }

  generateGqlSubscription(root: RootNode): string {
    return new SubscriptionGenerator().generate(root.mutations()).toString();
  }

  generateGqlContext(root: RootNode): string {
    return new ContextGenerator().generate(root.contexts).toString();
  }

  generateOnceFiles(): Array<{ name: string; body: string }> {
    const contextFile = `\
import { BaseGqlContext } from './__generated__/context';
export interface GqlContext extends BaseGqlContext {}
`;
    const pubsubFile = `\
import { PubSub } from "apollo-server";
import { PubSubEngine } from "graphql-subscriptions";

export const pubsub: PubSubEngine = new PubSub();
`;
    const schemaFile = `\
import { assignDeep, createTypeDef } from "sasat";
import { typeDef } from "./__generated__/typeDefs";
import { resolvers } from "./__generated__/resolver";

export const schema = {
  typeDefs: createTypeDef(assignDeep(typeDef, {})),
  resolvers: assignDeep(resolvers, {}),
};

`;
    return [
      {
        name: 'context',
        body: contextFile,
      },
      {
        name: 'pubsub',
        body: pubsubFile,
      },
      {
        name: 'schema',
        body: schemaFile,
      },
    ];
  }
}
