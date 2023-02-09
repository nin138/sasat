import { GQLContext } from './context.js';
import { ResolverMiddleware } from 'sasat';

export const testMiddleware: ResolverMiddleware<GQLContext> = args => {
  throw new Error('TODO: Not implemented');
  return args;
};
export const t2Middleware: ResolverMiddleware<GQLContext> = args => {
  throw new Error('TODO: Not implemented');
  return args;
};

export const hoge: ResolverMiddleware<GQLContext> = args => {
  throw new Error('TODO: Not implemented');
  return args;
};
