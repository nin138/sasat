import { QueryConditionNode } from '../generatorv2/nodes/QueryConditionNode.js';
import { GQLQuery } from './data/GQLOption.js';

const single = (name: string, conditions?: QueryConditionNode[]): GQLQuery => ({
  type: 'single',
  name,
  conditions: conditions || [],
});

const listAll = (
  name: string,
  conditions?: QueryConditionNode[],
): GQLQuery => ({
  type: 'list-all',
  name,
  conditions: conditions || [],
});

const paging = (name: string, conditions?: QueryConditionNode[]): GQLQuery => ({
  type: 'list-paging',
  name,
  conditions: conditions || [],
});

const primary = (): GQLQuery => ({
  type: 'primary',
  conditions: [],
});

export const Queries = {
  single,
  listAll,
  paging,
  primary: primary(),
};
