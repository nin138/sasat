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

export interface GQLOption {
  enabled: boolean,
  query: {
    find: boolean,
    list: false | 'all' | 'paging',
  },
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

export const getDefaultGqlOption = (): GQLOption => ({
  enabled: false,
  query: {
    find: true,
    list: 'all',
  },
  mutation: {
    create: defaultMutationOption,
    update: defaultMutationOption,
    delete: defaultMutationOption,
    fromContextColumns: [],
  },
});

export const updateMutationOption = (
  option: GQLOption,
  mutation: Partial<GQLOption['mutation']>,
): GQLOption => {
  return {
    ...option,
    mutation: {
      ...option.mutation,
      ...mutation,
    },
  };
};
