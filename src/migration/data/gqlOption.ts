export interface GqlFromContextParam {
  column: string;
  contextName?: string;
}

type Enabled = {
  enabled: boolean;
};

export type MutationOption = {
  noReFetch: boolean;
  subscription: boolean;
  subscriptionFilter: string[];
};

export interface GqlOption {
  mutation: {
    create: MutationOption & Enabled;
    update: MutationOption & Enabled;
    delete: Omit<MutationOption, 'noReFetch'> & Enabled;
    fromContextColumns: GqlFromContextParam[];
  };
}

export const defaultMutationOption = {
  enabled: false,
  noReFetch: false,
  subscription: false,
  subscriptionFilter: [],
};

export const getDefaultGqlOption = (): GqlOption => ({
  mutation: {
    create: defaultMutationOption,
    update: defaultMutationOption,
    delete: defaultMutationOption,
    fromContextColumns: [],
  },
});

export const updateMutationOption = (option: GqlOption, mutation: Partial<GqlOption['mutation']>): GqlOption => {
  return {
    ...option,
    mutation: {
      ...option.mutation,
      ...mutation,
    },
  };
};
