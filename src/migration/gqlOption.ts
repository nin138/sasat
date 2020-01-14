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
    filter: string[];
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
    filter: [],
  },
});

export const mergeGqlOption = (prev: GqlOption, update: NestedPartial<GqlOption>): GqlOption => {
  return {
    ...prev,
    mutation: {
      ...prev.mutation,
      ...update.mutation,
      fromContextColumns:
        (update.mutation?.fromContextColumns?.filter(it => it.column) as Array<{
          column: string;
          contextName?: string;
        }>) || prev.mutation.fromContextColumns,
    },
    subscription: {
      ...prev.subscription,
      ...update.subscription,
    },
  };
};
