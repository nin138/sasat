import { config } from "../../config/config.js";
import type { GQLMutation } from "../../migration/data/GQLOption.js";

export const subscriptionEnabled = (mutation: GQLMutation): boolean =>
  config().generator.gql.subscription && mutation.subscription.enabled;
