import { GraphQLResolveInfo } from 'graphql/type';
import { ResolverMiddleware } from './resolverMiddleware.js';

export type ResolverArgs<Context, Params = unknown> = [
  _: unknown,
  params: Params,
  context: Context,
  info: GraphQLResolveInfo,
];

export type Resolver<Context, Params> = (
  _: unknown,
  params: Params,
  context: Context,
  info: GraphQLResolveInfo,
) => unknown;

export const makeResolver = <Context, Params>(
  resolver: Resolver<Context, Params>,
  middlewares: ResolverMiddleware<Context, Params>[] = [],
): Resolver<Context, Params> => {
  return (...args: Parameters<typeof resolver>) => {
    const newArgs = middlewares.reduce((args, middleware) => {
      return middleware(args);
    }, args);
    return resolver(...newArgs);
  };
};
