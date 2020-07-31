import { EntityNode } from './entity';
import { RepositoryNode } from './repository';

export interface CodeGeneratable {
  entities: EntityNode[];
  repositories: RepositoryNode[];
}
