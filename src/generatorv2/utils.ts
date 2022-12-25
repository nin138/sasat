import { EntityName } from '../parser/node/entityName.js';

export const tableNameToEntityName = (tableName: string) =>
  EntityName.fromTableName(tableName).name;

export const nonNullableFilter = <T>(
  item: T,
): item is NonNullable<typeof item> => item != null;
