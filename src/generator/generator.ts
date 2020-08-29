import { IrGql } from '../ir/gql';
import { EntityNode } from '../node/entity';
import { RepositoryNode } from '../node/repository';
import { CodeGeneratable } from '../node/codeGeneratable';
import { ContextNode } from '../node/gql/contextNode';
import { MutationNode } from '../node/gql/mutationNode';
import { ResolverNode } from '../node/gql/resolverNode';
import { RootNode } from '../node/rootNode';

export interface CodeGenerator {
  readonly fileExt: string;
  generateEntity(entity: EntityNode): string;
  generateGeneratedRepository(repository: RepositoryNode): string;
  generateRepository(repository: RepositoryNode): string;
  generateGqlTypeDefs(gql: IrGql): string;
  generateGqlResolver(nodes: ResolverNode[]): string;
  generateGqlQuery(repositories: RepositoryNode[]): string;
  generateGqlMutation(nodes: MutationNode[]): string;
  generateGqlSubscription(nodes: MutationNode[]): string;
  generateGqlContext(contexts: ContextNode[]): string;
  generateOnceFiles(RootNode: RootNode): Array<{ name: string; body: string }>;
}
