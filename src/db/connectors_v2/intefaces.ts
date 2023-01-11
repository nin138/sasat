export type QueryResponse = Array<{ [key: string]: string }>;
export interface CommandResponse {
  insertId: number;
  affectedRows: number;
  changedRows: number;
}

export type SQLValueType = string | number | boolean | null;

export interface SQLExecutor {
  query(sql: string, values: SQLValueType[]): Promise<QueryResponse>;
  command(sql: string, values: SQLValueType[]): Promise<CommandResponse>;
}

export interface SQLTransaction extends SQLExecutor {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DBClient extends SQLExecutor {
  released(): boolean;
  transaction(): Promise<SQLTransaction>;
  release(): Promise<void>;
}
