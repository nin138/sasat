import {
  ArgQueryConditionValue,
  QueryConditionNode,
} from '../../generatorv2/nodes/QueryConditionNode.js';
import { EntityNode } from '../../generatorv2/nodes/entityNode.js';

export interface GqlFromContextParam {
  column: string;
  contextName?: string;
}

export type MutationOption = {
  noReFetch: boolean;
  subscription: boolean;
  subscriptionFilter: string[];
};

export type GQLMutation = {
  type: 'create' | 'update' | 'delete';
  noReFetch: boolean;
  middlewares: string[];
  contextFields: GqlFromContextParam[];
  subscription: {
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
}

export const defaultGQLOption = (): GQLOption => ({
  enabled: false,
  queries: [],
  mutations: [],
});

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
