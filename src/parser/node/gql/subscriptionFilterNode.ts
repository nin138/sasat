import { GqlPrimitive } from '../../../generator/gql/types.js';

export class SubscriptionFilterNode {
  constructor(readonly columnName: string, readonly type: GqlPrimitive) {}
}
