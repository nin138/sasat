import { IrGqlMutation } from '../../../ir/gql/mutation';

export const generateTsGqlSubscriptionString = (ir: IrGqlMutation) => {
  const subscriptionNames = ir.entities.flatMap(it => {
    const result = [];
    if (it.subscription.onCreate) {
      result.push(`${it.entityName}Created`);
    }
    if (it.subscription.onUpdate) {
      result.push(`${it.entityName}Updated`);
    }
    return result;
  });
  const names = subscriptionNames.map(it => `${it} = '${it}',`);
  const subscriptions = subscriptionNames.map(
    it => `${it}: { subscribe: () => pubsub.asyncIterator([SubscriptionName.${it}]), },`,
  );

  return `\
import { PubSubEngine } from 'graphql-subscriptions';
import { PubSub } from "apollo-server";

export const pubsub: PubSubEngine = new PubSub();

export enum SubscriptionName {
${names.join('\n')}
};

export const subscription = {
${subscriptions.join('\n')}
};

`;
};
