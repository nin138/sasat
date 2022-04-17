import { FileData } from '../generator.js';

const contextFile = `\
import { BaseGqlContext } from './__generated__/context.js';
export interface GqlContext extends BaseGqlContext {}
`;
const pubsubFile = `\
import { PubSub, PubSubEngine } from "graphql-subscriptions";

export const pubsub: PubSubEngine = new PubSub();
`;
const schemaFile = `\
import { assignDeep, createTypeDef } from "sasat";
import { typeDef } from "./__generated__/typeDefs.js";
import { resolvers } from "./__generated__/resolver.js";

export const schema = {
  typeDefs: createTypeDef(assignDeep(typeDef, {})),
  resolvers: assignDeep(resolvers, {}),
};
`;

const baseDBDataSourceFile = `\
import { Fields, SasatRepository } from 'sasat';
import { dataStoreInfo } from './__generated__/relationMap.js';


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
