import { formatQuery } from './formatQuery';
export type QueryResponse = Array<{ [key: string]: string }>;
export interface CommandResponse {
  insertId: number;
  affectedRows: number;
}

export type SqlValueType = string | number | boolean | null;

export interface SQLExecutor {
  rawQuery(sql: string): Promise<QueryResponse>;
  rawCommand(sql: string): Promise<CommandResponse>;
}

export abstract class SQLClient implements SQLExecutor {
  rawQuery(sql: string): Promise<QueryResponse> {
    return this.execSql(sql) as Promise<QueryResponse>;
  }

  rawCommand(sql: string): Promise<CommandResponse> {
    return this.execSql(sql) as Promise<CommandResponse>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(templateString: TemplateStringsArray, ...params: any[]): Promise<QueryResponse> {
    return this.execSql(formatQuery(templateString, ...params)) as Promise<QueryResponse>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  command(templateString: TemplateStringsArray, ...params: any[]): Promise<CommandResponse> {
    return this.execSql(formatQuery(templateString, ...params)) as Promise<CommandResponse>;
  }

  protected abstract execSql(sql: string): Promise<QueryResponse | CommandResponse>;
}

export abstract class SQLTransaction extends SQLClient {
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;
}

export abstract class DBClient extends SQLClient {
  abstract transaction(): Promise<SQLTransaction>;
  abstract release(): void;
}
