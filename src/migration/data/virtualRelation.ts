import { JoinConditionNode } from '../../generatorv2/nodes/JoinConditionNode.js';

export type VirtualRelation = {
  parentTable: string;
  childTable: string;
  parentFieldName?: string;
  childFieldName?: string;
  conditions: JoinConditionNode[];
  parentType?: 'array' | 'nullable' | 'notnull';
  childType?: 'array' | 'nullable' | 'notnull';
};
