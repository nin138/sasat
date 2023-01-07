import { Relation } from './relation.js';
import { ConditionNode } from '../../generatorv2/nodes/ConditionNode.js';

export type VirtualRelation = {
  parentTable: string;
  childTable: string;
  parentFieldName: string | false;
  childFieldName: string | false;
  conditions: ConditionNode[];
  parentType?: 'array' | 'nullable' | 'notnull';
  childType?: 'nullable' | 'notnull' | 'array';
};
