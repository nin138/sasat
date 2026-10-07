import type { GraphQLResolveInfo } from "graphql/type";
import type { ResolverMiddleware } from "./resolverMiddleware.js";

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

export const makeResolver = <
  Context,
  RequiredParams,
  IncomingParams = RequiredParams,
>(
  resolver: Resolver<Context, RequiredParams>,
  middlewares: ResolverMiddleware<
    Context,
    RequiredParams,
    IncomingParams
  >[] = [],
): Resolver<Context, IncomingParams> => {
  return (...args: ResolverArgs<Context, IncomingParams>) => {
    const newArgs: ResolverArgs<Context, RequiredParams | IncomingParams> =
      middlewares.reduce<
        ResolverArgs<Context, RequiredParams | IncomingParams>
      >(
        (
          args: ResolverArgs<Context, RequiredParams | IncomingParams>,
          middleware,
        ) => {
          return middleware(args);
        },
        args,
      );
    return resolver(...(newArgs as ResolverArgs<Context, RequiredParams>));
  };
};
