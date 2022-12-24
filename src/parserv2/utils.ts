import { EntityName } from '../parser/node/entityName.js';

export const tableNameToEntityName = (tableName: string) =>
  EntityName.fromTableName(tableName).name;
