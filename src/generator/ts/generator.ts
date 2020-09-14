import { CodeGenerator, FileData } from '../generator';
import { EntityGenerator } from './entityGenerator';
import { TypeDefGenerator } from './gql/typeDefGenerator';
import { QueryGenerator } from './gql/queryGenerator';
import { ResolverGenerator } from './gql/resolverGenerator';
import { MutationGenerator } from './gql/mutationGenerator';
import { SubscriptionGenerator } from './gql/subscriptionGenerator';
import { ContextGenerator } from './gql/contextGenerator';
import { GeneratedRepositoryGenerator } from './db/generatedRepositoryGenerator';
import { RepositoryGenerator } from './db/repositoryGenerator';
import { staticFiles } from './staticFiles';
import { RelationMapGenerator } from './relationMapGenerator';
import { FieldGenerator } from './fieldGenerator';
import { EntityNode } from '../../parser/node/entityNode';
import { RepositoryNode } from '../../parser/node/repositoryNode';
import { RootNode } from '../../parser/node/rootNode';

export class TsCodeGenerator implements CodeGenerator {
  readonly fileExt = 'ts';

  generateEntity(entity: EntityNode): string {
    return new EntityGenerator(entity).generate().toString();
  }

  generateGeneratedRepository(repository: RepositoryNode): string {
    return new GeneratedRepositoryGenerator(repository).generate().toString();
  }

  generateRepository(repository: RepositoryNode): string {
    return new RepositoryGenerator().generate(repository).toString();
  }

  generateGqlTypeDefs(root: RootNode): string {
    return new TypeDefGenerator().generate(root).toString();
  }

  generateGqlQuery(root: RootNode): string {
    return new QueryGenerator().generate(root.repositories).toString();
  }

  generateGqlResolver(root: RootNode): string {
    return new ResolverGenerator().generate(root).toString();
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

  generateFiles(root: RootNode): FileData {
    return [
      { name: 'relationMap', body: new RelationMapGenerator().generate(root).toString() },
      { name: 'fields', body: new FieldGenerator().generate(root).toString() },
    ];
  }

  generateOnceFiles(): FileData {
    return staticFiles;
  }
}
