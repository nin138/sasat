import { TableInfo } from '../../migration/table/tableInfo';
import { ReferenceColumnInfo } from '../../migration/column/referenceColumn';
import { capitalizeFirstLetter } from '../../util';

export interface QueryInfo {
  entity: string;
  keys: string[];
  unique: boolean;
  ref?: Pick<ReferenceColumnInfo, 'table' | 'column'>;
}

export const getFindQueries = (table: TableInfo): QueryInfo[] => {
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
    ...table.references
      .filter(it => !isDuplicate([it.column]))
      .map(it => ({
        entity: entity,
        keys: [it.column],
        unique: it.unique,
        ref: { table: it.table, column: it.column },
      })),
  );
  queries.push(
    ...table.uniqueKeys
      .filter(it => !isDuplicate(it))
      .map(it => ({ entity: entity, keys: it, unique: true, isRef: false })),
  );
  return queries;
};
