import { SerializedColumn } from './serializedColumn';
import { Index } from '../data';
import { GqlOption } from '../data/gqlOption';
import { DomainObjectDefinition } from '../domain/domainDifinition';

export interface SerializedStore {
  tables: SerializedTable[];
  domains: DomainObjectDefinition[];
}

export interface SerializedTable {
  columns: SerializedColumn[];
  primaryKey: string[];
  uniqueKeys: string[][];
  indexes: Index[];
  tableName: string;
  gqlOption: GqlOption;
}
