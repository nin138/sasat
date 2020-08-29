import { CodeGenerator } from '../generator';
import * as prettier from 'prettier';
import { EntityNode } from '../../node/entity';
import { TsEntityGenerator } from './v2/entity';
import { RepositoryNode } from '../../node/repository';
import { QueryGenerator } from './v2/gql/query';
import { ResolverGenerator } from './v2/gql/resolver';
import { TsGeneratorGqlContext } from './v2/gql/context';
import { MutationGenerator } from './v2/gql/mutation';
import { SubscriptionGenerator } from './v2/gql/subscription';
import { GeneratedRepositoryGenerator } from './v2/db/generatedRepository';
import { generateRepositoryString } from './v2/db/repository';
import { TypeDefGenerator } from './v2/gql/typeDef';
import { RootNode } from '../../node/rootNode';

export class TsCodeGenerator implements CodeGenerator {
  readonly fileExt = 'ts';

  private formatCode(code: string) {
    return prettier.format(code, { parser: 'typescript' });
  }

  generateEntity(entity: EntityNode): string {
    return new TsEntityGenerator(entity).generate().toString();
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
    return new MutationGenerator().generate(root.gql.mutations).toString();
  }

  generateGqlSubscription(root: RootNode): string {
    return new SubscriptionGenerator().generate(root.gql.mutations).toString();
  }

  generateGqlContext(root: RootNode): string {
    return this.formatCode(new TsGeneratorGqlContext().generate(root.gql.contexts));
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
