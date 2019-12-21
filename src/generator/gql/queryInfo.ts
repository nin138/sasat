import { ReferenceColumnData } from '../../entity/referenceColumn';

export interface QueryInfo {
  entity: string;
  keys: string[];
  unique: boolean;
  ref?: Pick<ReferenceColumnData, 'targetTable' | 'targetColumn'>;
}
