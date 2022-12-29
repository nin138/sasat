import { generateEntityFile } from './ts/generateEntity.js';
import { EntityNode } from '../nodes/entityNode.js';
import { RootNode } from '../nodes/rootNode.js';
import { generateTypeDefs } from './gql/generateTypeDefs.js';
import { generateQueryResolver } from './ts/generateQueryResolver.js';
import { generateMutationResolver } from './ts/generateMutationResolver.js';
import { generateRelationMap } from './ts/generateRelationMap.js';
import { generateFields } from './ts/generateFields.js';

export type FileData = { name: string; body: string };

export class TsCodegen_v2 {
  readonly fileExtension = '.ts';
  generateEntity = (node: EntityNode) => generateEntityFile(node).toString();
  generateGqlTypeDefs = (root: RootNode) => generateTypeDefs(root).toString();
  // generateGqlResolver = (root: RootNode) =>
  generateGqlQuery = (root: RootNode) => generateQueryResolver(root).toString();
  generateGqlMutation = (root: RootNode) =>
    generateMutationResolver(root).toString();
  // generateGqlSubscription = (root: RootNode) =>
  // generateGQLContext = (root: RootNode) =>
  generateFiles = (root: RootNode): FileData[] => {
    return [
      {
        name: 'relationMap',
        body: generateRelationMap(root).toString(),
      },
      { name: 'fields', body: generateFields(root).toString() },
    ];
  };
}
