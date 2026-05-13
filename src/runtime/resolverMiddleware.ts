import type { ResolverArgs } from './makeResolver.js';

export type ResolverMiddleware<
  Context,
  // biome-ignore lint/suspicious/noExplicitAny: <>
  RequiredParams = any,
  IncomingParams = RequiredParams,
> = (
  args: ResolverArgs<Context, IncomingParams | RequiredParams>,
) => ResolverArgs<Context, RequiredParams | IncomingParams>;

export const makeParamsMiddleware = <
  RequiredParams,
  IncomingParams = RequiredParams,
>(
  update: (params: RequiredParams) => IncomingParams,
): ResolverMiddleware<never, RequiredParams, IncomingParams> => {
  return args => {
    args[1] = update(args[1] as RequiredParams);
    return args;
  };
};
