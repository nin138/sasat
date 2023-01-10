import { generateEntityFile } from './ts/generateEntity.js';
import { EntityNode } from '../nodes/entityNode.js';
import { RootNode } from '../nodes/rootNode.js';
import { generateTypeDefs } from './gql/generateTypeDefs.js';
import { generateQueryResolver } from './ts/generateQueryResolver.js';
import { generateMutationResolver } from './ts/generateMutationResolver.js';
import { generateRelationMap } from './ts/relationMap/index.js';
import { generateFields } from './ts/generateFields.js';
import { generateAutoGeneratedDatasource } from './ts/generateAutoGeneratedDatasource.js';
import { staticFiles } from './ts/staticFiles.js';
import { generateDatasource } from './ts/generateDatasource.js';
import { generateResolver } from './ts/generateResolver.js';
import { generateContext } from './ts/generateContext.js';
import { generateSubscription } from './ts/generateSubscription.js';
import { generateUserDefinedCondition } from './ts/generateUserDefinedCondition.js';

export type FileData = { name: string; body: string };

export class TsCodegen_v2 {
  readonly fileExtension = 'ts';
  generateEntity = (node: EntityNode) => generateEntityFile(node).toString();
  generateDatasource = (node: EntityNode) =>
    generateDatasource(node).toString();
  generateGeneratedDatasource = (node: EntityNode) =>
    generateAutoGeneratedDatasource(node).toString();
  generateGqlTypeDefs = (root: RootNode) => generateTypeDefs(root).toString();
  generateGqlResolver = (root: RootNode) => generateResolver(root).toString();
  generateGqlQuery = (root: RootNode) => generateQueryResolver(root).toString();
  generateGqlMutation = (root: RootNode) =>
    generateMutationResolver(root).toString();
  generateGqlSubscription = (root: RootNode) =>
    generateSubscription(root).toString();
  generateGQLContext = (root: RootNode) => generateContext(root).toString();
  generateFiles = (root: RootNode): FileData[] => {
    return [
      {
        name: 'relationMap',
        body: generateRelationMap(root).toString(),
      },
      { name: 'fields', body: generateFields(root).toString() },
    ];
  };
  generateOnceFiles = (): FileData[] => {
    return staticFiles;
  };
  generateConditions = (root: RootNode, currentFile: string): string | null => {
    return generateUserDefinedCondition(root, currentFile);
  };
}
