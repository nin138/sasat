import { ResolverArgs } from './makeResolver.js';

export type ResolverMiddleware<
  Context,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
