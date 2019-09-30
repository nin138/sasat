import { ReferenceColumnInfo } from '../../migration/column/referenceColumn';
import { capitalizeFirstLetter } from '../../util';
import { TableGenerator } from '../store';

export interface QueryInfo {
  entity: string;
  keys: string[];
  unique: boolean;
  ref?: Pick<ReferenceColumnInfo, 'targetTable' | 'targetColumn'>;
}

export const getFindQueries = (table: TableGenerator): QueryInfo[] => {
  const queries: QueryInfo[] = [];
  const isDuplicate = (keys: string[]) => {
    outer: for (const q of queries) {
      if (keys.length !== q.keys.length) continue;
      for (const [i, it] of keys.entries()) {
        if (it !== q.keys[i]) continue outer;
      }
      return true;
    }
    return false;
  };

  const entity = capitalizeFirstLetter(table.tableName);
  if (table.primaryKey) queries.push({ entity: entity, keys: table.primaryKey, unique: true });
  queries.push(
    ...table.columns
      .filter(it => it.info.reference !== undefined)
      .map(it => it.info.reference!)
      .filter(it => !isDuplicate([it.targetColumn]))
      .map(it => ({
        entity: entity,
        keys: [it.targetColumn],
        unique: it.unique,
        ref: { targetTable: it.targetTable, targetColumn: it.targetColumn },
      })),
  );
  queries.push(
    ...table.uniqueKeys
      .filter(it => !isDuplicate(it))
      .map(it => ({ entity: entity, keys: it, unique: true, isRef: false })),
  );
  return queries;
};
