/* eslint-disable */
import { pubsub } from "../pubsub.js";
import { withFilter } from "graphql-subscriptions";
import { User } from "./entities/User.js";
import { StockIdentifiable } from "./entities/Stock.js";
export enum SubscriptionName {
  UserCreated = "UserCreated",
  UserUpdated = "UserUpdated",
  StockDeleted = "StockDeleted",
}
export const subscription = {
  UserCreated: {
    subscribe: () => pubsub.asyncIterator([SubscriptionName.UserCreated]),
  },
  UserUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SubscriptionName.UserUpdated]),
      async (payload: any, variables: any): Promise<boolean> => {
        const result = await payload.UserUpdated;
        return result.NNN === variables.NNN;
      }
    ),
  },
};
export const publishUserCreated = (entity: User): Promise<void> =>
  pubsub.publish(SubscriptionName.UserCreated, { UserCreated: entity });
export const publishUserUpdated = (entity: User): Promise<void> =>
  pubsub.publish(SubscriptionName.UserUpdated, { UserUpdated: entity });
export const publishStockDeleted = (entity: StockIdentifiable): Promise<void> =>
  pubsub.publish(SubscriptionName.StockDeleted, { StockDeleted: entity });
