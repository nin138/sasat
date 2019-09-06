export type DBTableName = string;
export type DBColumnName = string;

export enum RedisDBCacheTypeNames {
  String = "string",
  JSONString = "json",
  Hash = "hash",
}

export interface SassatRedisCacheConfString {
  name: string;
  type: RedisDBCacheTypeNames.String;
  keyPrefix: string;
  table: DBTableName;
  key: DBColumnName;
  value: DBColumnName;
}

export interface SassatRedisCacheConfJSONString {
  name: string;
  type: RedisDBCacheTypeNames.JSONString;
  keyPrefix: string;
  table: DBTableName;
  key: DBColumnName;
  values: DBColumnName[];
}

export interface SassatRedisCacheConfHash {
  name: string;
  type: RedisDBCacheTypeNames.Hash;
  keyPrefix: string;
  table: DBTableName;
  key: DBColumnName;
  values: DBColumnName[];
}

export type SassatRedisCacheType =
  | SassatRedisCacheConfString
  | SassatRedisCacheConfJSONString
  | SassatRedisCacheConfHash;
