import { FileData } from '../generator.js';
import {ImportDeclaration} from "./code/importDeclaration.js";
const contextFile = `\
${new ImportDeclaration(['BaseGqlContext'], './__generated__/context').toString()}
export interface GqlContext extends BaseGqlContext {}
`;
const pubsubFile = `\
${new ImportDeclaration(['PubSub', 'PubSubEngine'], 'graphql-subscriptions').toString()}

export const pubsub: PubSubEngine = new PubSub();
`;
const schemaFile = `\
${new ImportDeclaration(['assignDeep', 'createTypeDef'], 'sasat').toString()}
${new ImportDeclaration(['typeDef'], './__generated__/typeDefs').toString()}
${new ImportDeclaration(['resolvers'], './__generated__/resolver.j').toString()}

export const schema = {
  typeDefs: createTypeDef(assignDeep(typeDef, {})),
  resolvers: assignDeep(resolvers, {}),
};
`;

const baseDBDataSourceFile = `\
${new ImportDeclaration(['Fields', 'SasatRepository'], 'sasat').toString()}
${new ImportDeclaration(['dataStoreInfo'], './__generated__/relationMap').toString()}

export abstract class BaseDBDataSource<Entity, Creatable, Identifiable, EntityFields extends Fields> extends SasatRepository<
  Entity,
  Creatable,
  Identifiable,
  EntityFields
> {
  protected maps = dataStoreInfo;
}
`;
export const staticFiles: FileData = [
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
  {
    name: 'baseDBDataSource',
    body: baseDBDataSourceFile,
  },
];
