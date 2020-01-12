export const generateTsResolverString = (additionalResolvers: string[]) => {
  const resolvers = ['Query: query', 'Mutation: mutation', 'Subscription: subscription', ...additionalResolvers];
  return `\
import { query } from './query';
import { mutation } from './mutation';
import {subscription} from "./subscription";

export const resolvers = {
${resolvers.map(it => `  ${it},`).join('\n')}
};

`;
};
