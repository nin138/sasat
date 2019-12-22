export const generateTsResolverString = () => `\
import { query } from './query';
import { mutation } from './mutation';

export const resolvers = {
  Query: query,
  Mutation: mutation,
};

`;
