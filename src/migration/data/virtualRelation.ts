import { Relation } from './relation.js';
import { ConditionNode } from '../../generatorv2/nodes/ConditionNode.js';

export type VirtualRelation = {
  parentTable: string;
  childTable: string;
  parentFieldName: string;
  childFieldName: string;
  conditions: ConditionNode[];
  relation: Relation;
};
