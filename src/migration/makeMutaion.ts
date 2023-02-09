import { GqlFromContextParam, GQLMutation } from './data/GQLOption.js';

type Option = {
  noRefetch?: boolean;
  middlewares?: string[];
  contextFields?: GqlFromContextParam[];
  subscription?: {
    enabled: boolean;
    subscriptionFilter?: string[];
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
  subscription: option?.subscription
    ? {
        enabled: option?.subscription.enabled,
        subscriptionFilter: option?.subscription.subscriptionFilter || [],
      }
    : {
        enabled: false,
        subscriptionFilter: [],
      },
});

export const Mutations = {
  create: (options?: Option): GQLMutation => formatOptions('create', options),
  update: (options?: Option): GQLMutation => formatOptions('update', options),
  delete: (options?: Omit<Option, 'noRefetch'>): GQLMutation =>
    formatOptions('delete', options),
};
