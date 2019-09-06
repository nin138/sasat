export type DBTableName = string;
export type DBColumnName = string;

export enum RedisDBCacheTypeNames {
  String = "string",
  JSONString = "json",
  Hash = "hash",
}

export interface SasatRedisCacheConfString {
  name: string;
  type: RedisDBCacheTypeNames.String;
  keyPrefix: string;
  table: DBTableName;
  key: DBColumnName;
  value: DBColumnName;
}

export interface SasatRedisCacheConfJSONString {
  name: string;
  type: RedisDBCacheTypeNames.JSONString;
  keyPrefix: string;
  table: DBTableName;
  key: DBColumnName;
  values: DBColumnName[];
}

export interface SasatRedisCacheConfHash {
  name: string;
  type: RedisDBCacheTypeNames.Hash;
  keyPrefix: string;
  table: DBTableName;
  key: DBColumnName;
  values: DBColumnName[];
}

export type SasatRedisCacheType = SasatRedisCacheConfString | SasatRedisCacheConfJSONString | SasatRedisCacheConfHash;
