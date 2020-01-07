import { NestedPartial } from '../util/type';

export interface GqlOption {
  mutation: {
    create: boolean;
    update: boolean;
    fromContextColumns: Array<{ column: string; contextName?: string }>;
  };
  subscription: {
    onCreate: boolean;
    onUpdate: boolean;
  };
}

export const getDefaultGqlOption = (): GqlOption => ({
  mutation: {
    create: true,
    update: true,
    fromContextColumns: [],
  },
  subscription: {
    onCreate: false,
    onUpdate: false,
  },
});

export const mergeGqlOption = (prev: GqlOption, update: NestedPartial<GqlOption>) => {
  return {
    ...prev,
    mutation: {
      ...prev.mutation,
      ...update.mutation,
    },
    subscription: {
      ...prev.subscription,
      ...update.subscription,
    },
  };
};
