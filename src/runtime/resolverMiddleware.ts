import { ResolverArgs } from './makeResolver.js';

export type ResolverMiddleware<
  Context,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RequiredParams = any,
  IncomingParams = RequiredParams,
> = (
  args: ResolverArgs<Context, IncomingParams | RequiredParams>,
) => ResolverArgs<Context, RequiredParams | IncomingParams>;
