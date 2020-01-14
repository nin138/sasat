import { IrGqlMutation } from '../../../ir/gql/mutation';
import { TsFileGenerator } from '../tsFileGenerator';

// export const generateTsGqlSubscriptionString = (ir: IrGqlMutation) => {
//   const subscriptionNames = ir.entities.flatMap(it => {
//     const result = [];
//     if (it.subscription.onCreate) {
//       result.push(`${it.entityName}Created`);
//     }
//     if (it.subscription.onUpdate) {
//       result.push(`${it.entityName}Updated`);
//     }
//     return result;
//   });
//   const names = subscriptionNames.map(it => `${it} = '${it}',`);
//   const subscriptions = subscriptionNames.map(
//     it => `${it}: { subscribe: () => pubsub.asyncIterator([SubscriptionName.${it}]), },`,
//   );
//
//   return `\
// import { PubSub } from "apollo-server";
//
// export const pubsub: PubSubEngine = new PubSub();
//
// export enum SubscriptionName {
// ${names.join('\n')}
// };
//
// export const subscription = {
// ${subscriptions.join('\n')}
// };
//
// `;
// };

export class TsGeneratorGqlSubscription extends TsFileGenerator {
  constructor(ir: IrGqlMutation) {
    super();
    this.addImport('graphql-subscriptions', 'PubSubEngine');
    this.addImport('apollo-server', 'PubSub');
    if (ir.entities.find(it => it.subscription.filter.length !== 0)) {
      this.addImport('graphql-subscriptions', 'withFilter');
    }
    const subscriptions = ir.entities.flatMap(it => {
      const result = [];
      if (it.subscription.onCreate) {
        result.push({ name: `${it.entityName}Created`, filter: it.subscription.filter });
      }
      if (it.subscription.onUpdate) {
        result.push({ name: `${it.entityName}Updated`, filter: it.subscription.filter });
      }
      return result;
    });
    const names = subscriptions.map(it => `${it.name} = '${it.name}',`);
    const functions = subscriptions.map(it => {
      if (it.filter.length === 0)
        return `${it.name}: { subscribe: () => pubsub.asyncIterator([SubscriptionName.${it.name}]), },`;
      return `${it.name}: { subscribe: withFilter(() => pubsub.asyncIterator([SubscriptionName.${it.name}]),
      async (payload, variables) => {
        const result = await payload.${it.name};
        return ${it.filter.map(it => `result.${it} === variables.${it}`).join('&&')};
      },
    ),},`;
    });

    this.addLine(
      'export const pubsub: PubSubEngine = new PubSub();',
      `export enum SubscriptionName {${names.join('\n')}};`,
      `export const subscription = {${functions.join('\n')}};`,
    );
  }
}
