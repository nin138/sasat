import { GqlFromContextParam, GQLMutation } from './data/GQLOption.js';

type Option = {
  noRefetch?: boolean;
  middlewares?: string[];
  contextFields?: GqlFromContextParam[];
  subscription?:
    | {
        enabled: boolean;
        subscriptionFilter?: string[];
      }
    | boolean;
};

const formatSubscription = (subscription: Option['subscription']) => {
  if (subscription === undefined || subscription === false) {
    return {
      enabled: false,
      subscriptionFilter: [],
    };
  }
  if (subscription === true)
    return {
      enabled: true,
      subscriptionFilter: [],
    };
  return {
    enabled: subscription.enabled,
    subscriptionFilter: subscription.subscriptionFilter || [],
  };
};

const formatOptions = (
  type: GQLMutation['type'],
  option?: Option,
): GQLMutation => ({
  type,
  noReFetch: option?.noRefetch || false,
  middlewares: option?.middlewares || [],
  contextFields: option?.contextFields || [],
  subscription: formatSubscription(option?.subscription),
});

export const Mutations = {
  create: (options?: Option): GQLMutation => formatOptions('create', options),
  update: (options?: Option): GQLMutation => formatOptions('update', options),
  delete: (options?: Omit<Option, 'noRefetch'>): GQLMutation =>
    formatOptions('delete', options),
};
