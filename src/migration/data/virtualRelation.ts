import { ConditionNode } from '../../generatorv2/nodes/ConditionNode.js';

export type VirtualRelation = {
  parentTable: string;
  childTable: string;
  parentFieldName: string;
  childFieldName: string;
  conditions: ConditionNode[];
  parentType?: 'array' | 'nullable' | 'notnull';
  childType?: 'array' | 'nullable' | 'notnull';
};
