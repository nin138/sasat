import { QueryConditionNode } from '../generatorv2/nodes/QueryConditionNode.js';
import { GQLQuery } from './data/GQLOption.js';

const single = (
  name: string,
  options?: { conditions?: QueryConditionNode[]; middlewares?: string[] },
): GQLQuery => ({
  type: 'single',
  name,
  conditions: options?.conditions || [],
  middlewares: options?.middlewares || [],
});

const listAll = (
  name: string,
  options?: { conditions?: QueryConditionNode[]; middlewares?: string[] },
): GQLQuery => ({
  type: 'list-all',
  name,
  conditions: options?.conditions || [],
  middlewares: options?.middlewares || [],
});

const paging = (
  name: string,
  options?: { conditions?: QueryConditionNode[]; middlewares?: string[] },
): GQLQuery => ({
  type: 'list-paging',
  name,
  conditions: options?.conditions || [],
  middlewares: options?.middlewares || [],
});

const primary = (middlewares: string[] = []): GQLQuery => ({
  type: 'primary',
  conditions: [],
  middlewares,
});

export const Queries = {
  single,
  listAll,
  paging,
  primary,
};
