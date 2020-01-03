export const generateTsResolverString = () => `\
import { query } from './query';
import { mutation } from './mutation';
import {subscription} from "./subscription";

export const resolvers = {
  Query: query,
  Mutation: mutation,
  Subscription: subscription,
};

`;
