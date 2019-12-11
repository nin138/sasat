export const getResolverString = () => `\
import { query } from './query';

export const resolvers = {
  Query: query
};
`;
