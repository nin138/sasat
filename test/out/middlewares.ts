import { GQLContext } from './context.js';
import { ResolverMiddleware } from 'sasat';

export const testMiddleware: ResolverMiddleware<GQLContext> = args => {
  console.log('testM1');
  return args;
};
export const t2Middleware: ResolverMiddleware<GQLContext> = args => {
  console.log('testM2');
  return args;
};

export const hoge: ResolverMiddleware<GQLContext> = args => {
  console.log('hoge');
  return args;
};
