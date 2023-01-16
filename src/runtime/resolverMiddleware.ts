import { ResolverArgs } from './makeResolver.js';

export type ResolverMiddleware<
  Context,
  RequiredParams = unknown,
  IncomingParams = RequiredParams,
> = (
  args: ResolverArgs<Context, IncomingParams | RequiredParams>,
) => ResolverArgs<Context, RequiredParams | IncomingParams>;
