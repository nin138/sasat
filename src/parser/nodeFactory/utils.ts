import { EntityName } from '../node/entityName.js';

export const tableNameToEntityName = (tableName: string) =>
  EntityName.fromTableName(tableName).name;
