import { GqlPrimitive } from '../../../generator/gql/types';

export class SubscriptionFilterNode {
  constructor(readonly columnName: string, readonly type: GqlPrimitive) {}
}
