import { getGeneratorConfig } from "../../config/config.js";
import type { GQLMutation } from "../../migration/data/GQLOption.js";

export const subscriptionEnabled = (mutation: GQLMutation): boolean =>
  getGeneratorConfig().gql.subscription && mutation.subscription.enabled;
