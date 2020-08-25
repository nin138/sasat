import { GqlPrimitive } from '../../generator/gql/types';
import { EntityName } from '../../entity/entityName';

export class SubscriptionFilterNode {
  constructor(readonly columnName: string, readonly type: GqlPrimitive) {}
}
