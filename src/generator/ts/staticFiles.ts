import { FileData } from '../generator';

const contextFile = `\
import { BaseGqlContext } from './__generated__/context';
export interface GqlContext extends BaseGqlContext {}
`;
const pubsubFile = `\
import { PubSub } from "apollo-server";
import { PubSubEngine } from "graphql-subscriptions";

export const pubsub: PubSubEngine = new PubSub();
`;
const schemaFile = `\
import { assignDeep, createTypeDef } from "sasat";
import { typeDef } from "./__generated__/typeDefs";
import { resolvers } from "./__generated__/resolver";

export const schema = {
  typeDefs: createTypeDef(assignDeep(typeDef, {})),
  resolvers: assignDeep(resolvers, {}),
};
`;

const baseDBDataSourceFile = `\
import { Fields, SasatRepository } from '../../src';
import { identifiableKeyMap, relationMap } from './__generated__/relationMap';


export abstract class BaseDBDataSource<Entity, Creatable, Identifiable, EntityFields extends Fields> extends SasatRepository<
  Entity,
  Creatable,
  Identifiable,
  EntityFields
> {
  protected maps = {
    relation: relationMap,
    identifiable: identifiableKeyMap,
  };
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
