import * as SqlString from 'sqlstring';
export type QueryResponse = Array<{ [key: string]: string }>;
export interface CommandResponse {
  insertId: number;
  affectedRows: number;
}

export type SqlValueType = string | number | Date;

export abstract class SQLClient {
  static escape(param: SqlValueType): string {
    return SqlString.escape(param);
  }

  rawQuery(sql: string): Promise<QueryResponse> {
    return this.execSql(sql) as Promise<QueryResponse>;
  }

  rawCommand(sql: string): Promise<CommandResponse> {
    return this.execSql(sql) as Promise<CommandResponse>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(templateString: TemplateStringsArray, ...params: any[]): Promise<QueryResponse> {
    return this.execSql(this.formatQuery(templateString, ...params)) as Promise<QueryResponse>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  command(templateString: TemplateStringsArray, ...params: any[]): Promise<CommandResponse> {
    return this.execSql(this.formatQuery(templateString, ...params)) as Promise<CommandResponse>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatQuery(str: TemplateStringsArray, ...params: any[]): string {
    let ret = str[0];
    for (let i = 0; i < params.length; i++) {
      if (typeof params[i] === 'function') ret += params[i]();
      else if (Array.isArray(params[i])) ret += params[i].map((it: any) => SQLClient.escape(it)).join(', ');
      else ret += SQLClient.escape(params[i]);
      ret += str[i + 1];
    }
    return ret;
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
