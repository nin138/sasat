import { ReferenceColumnInfo } from '../../migration/column/referenceColumn';

export interface QueryInfo {
  entity: string;
  keys: string[];
  unique: boolean;
  ref?: Pick<ReferenceColumnInfo, 'targetTable' | 'targetColumn'>;
}
