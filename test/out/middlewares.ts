import { GQLContext } from './context.js';
import { ResolverMiddleware } from 'sasat';

export const t2Middleware: ResolverMiddleware<GQLContext> = args => {
  throw new Error('TODO: Not implemented');
  return args;
};

export const testMiddleware: ResolverMiddleware<
  GQLContext,
  any,
  any
> = args => {
  throw new Error('TODO: Not implemented');
  return args;
};
