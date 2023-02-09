import {
  ArgQueryConditionValue,
  QueryConditionNode,
} from '../../generatorv2/nodes/QueryConditionNode.js';
import { EntityNode } from '../../generatorv2/nodes/entityNode.js';

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

export type GQLMutation = {
  type: 'create' | 'update' | 'delete';
  noReFetch: boolean;
  contextFields: GqlFromContextParam[];
  subscription?: {
    enabled: boolean;
    subscriptionFilter: string[];
  };
};

export type GQLQuery =
  | {
      type: 'single' | 'list-all' | 'list-paging';
      name: string;
      conditions: QueryConditionNode[];
      middlewares: string[];
    }
  | {
      type: 'primary';
      name?: never;
      conditions: never[];
      middlewares: string[];
    };

export interface GQLOption {
  enabled: boolean;
  queries: GQLQuery[];
  mutations: GQLMutation[];
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
  queries: [],
  mutations: [],
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

export const getArgs = (
  query: GQLQuery,
  entity: EntityNode,
): ArgQueryConditionValue[] => {
  if (query.type === 'primary')
    return entity.fields
      .filter(it => it.isPrimary)
      .map(it => ({
        kind: 'arg',
        name: it.fieldName,
        type: it.gqlType,
      }));
  const r: ArgQueryConditionValue[] = [];
  if (query.type === 'list-paging') {
    r.push({
      kind: 'arg',
      name: 'option',
      type: 'PagingOption',
    });
  }
  query.conditions.forEach(it => {
    if (it.left.kind === 'arg') r.push(it.left);
    if (it.kind === 'between') {
      if (it.begin.kind === 'arg') r.push(it.begin);
      if (it.end.kind === 'arg') r.push(it.end);
    } else if (it.right.kind === 'arg') r.push(it.right);
  });
  return r;
};
