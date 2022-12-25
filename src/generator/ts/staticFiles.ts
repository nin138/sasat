import { FileData } from '../generator.js';
import { ImportDeclaration } from '../../tsg/importDeclaration.js';
const contextFile = `\
${new ImportDeclaration(
  ['BaseGQLContext'],
  './__generated__/context',
).toString()}
export type GQLContext = BaseGQLContext & Record<string, never>;
`;
const pubsubFile = `\
${new ImportDeclaration(
  ['PubSub', 'PubSubEngine'],
  'graphql-subscriptions',
).toString()}

export const pubsub: PubSubEngine = new PubSub();
`;
const schemaFile = `\
${new ImportDeclaration(['assignDeep', 'createTypeDef'], 'sasat').toString()}
${new ImportDeclaration(
  ['typeDefs', 'inputs'],
  './__generated__/typeDefs',
).toString()}
${new ImportDeclaration(['resolvers'], './__generated__/resolver').toString()}

export const schema = {
  typeDefs: createTypeDef(
    assignDeep(typeDefs, {}),
    assignDeep(inputs, {}),
  ),
  resolvers: assignDeep(resolvers, {}),
};
`;

const baseDBDataSourceFile = `\
${new ImportDeclaration(
  ['Fields', 'SasatDBDatasource', 'EntityType'],
  'sasat',
).toString()}
${new ImportDeclaration(
  ['relationMap', 'tableInfo'],
  './__generated__/relationMap',
).toString()}

export abstract class BaseDBDataSource<
  Entity extends EntityType,
  Creatable,
  Identifiable,
  EntityFields extends Fields<Entity>,
  QueryResult extends Partial<Entity> & Identifiable,
> extends SasatDBDatasource<Entity, Creatable, Identifiable, EntityFields, QueryResult> {
  protected relationMap = relationMap;
  protected tableInfo = tableInfo;
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
