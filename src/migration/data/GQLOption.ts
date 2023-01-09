import {
  ArgQueryConditionValue,
  QueryConditionNode,
  QueryConditionValue,
} from '../../generatorv2/nodes/QueryConditionNode.js';

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

export type GQLQuery = {
  type: 'single' | 'list-all' | 'list-paging';
  name: string;
  conditions: QueryConditionNode[];
};

export interface GQLOption {
  enabled: boolean;
  // TODO Remove
  query: {
    find: boolean;
    list: false | 'all' | 'paging';
  };
  queries: GQLQuery[];
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
  queries: [],
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

export const getArgs = (query: GQLQuery): ArgQueryConditionValue[] => {
  return query.conditions.flatMap(it => {
    const r: ArgQueryConditionValue[] = [];
    if (it.left.kind === 'arg') r.push(it.left);
    if (it.kind === 'between') {
      if (it.begin.kind === 'arg') r.push(it.begin);
      if (it.end.kind === 'arg') r.push(it.end);
    } else if (it.right.kind === 'arg') r.push(it.right);
    return r;
  });
};
