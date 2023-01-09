import { GQLContext } from './context.js';
import { CustomCondition } from 'sasat';

export const hoge: CustomCondition<GQLContext> = () => {
  throw new Error('TODO: Not Implemented');
};
