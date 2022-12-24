import {ResolverArgs} from "./createResolver.js";

export type ResolverMiddleware<Context, Params = unknown> = (
  args: ResolverArgs<Context, Params>
) => ResolverArgs<Context, Params>;
