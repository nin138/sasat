import { EntityNode } from '../parser/node/entityNode.js';
import { RootNode } from '../parser/node/rootNode.js';
import { RepositoryNode } from '../parser/node/repositoryNode.js';

export type FileData = Array<{ name: string; body: string }>;

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
  generateGQLContext(root: RootNode): string;
  generateFiles(RootNode: RootNode): FileData;
  generateOnceFiles(RootNode: RootNode): FileData;
}
