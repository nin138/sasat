import { EntityNode } from '../node/entityNode';
import { RepositoryNode } from '../node/repositoryNode';
import { RootNode } from '../node/rootNode';

export interface CodeGenerator {
  readonly fileExt: string;
  generateEntity(entity: EntityNode): string;
  generateGeneratedRepository(repository: RepositoryNode): string;
  generateRepository(repository: RepositoryNode): string;
  generateGqlTypeDefs(root: RootNode): string;
  generateGqlResolver(root: RootNode): string;
  generateGqlQuery(root: RootNode): string;
  generateGqlMutation(root: RootNode): string;
  generateGqlSubscription(root: RootNode): string;
  generateGqlContext(root: RootNode): string;
  generateOnceFiles(RootNode: RootNode): Array<{ name: string; body: string }>;
}
