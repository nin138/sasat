export const getResolverString = () => `\
import { query, mutation } from './query';

export const resolvers = {
  Query: query,
  Mutation: mutation,
};
`;
