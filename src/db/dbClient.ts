import * as SqlString from "sqlstring";
export type QueryResponse = Array<{ [key: string]: string }>;
export type CommandResponse = any;

export abstract class SQLClient {
  abstract rawQuery(sql: string): Promise<QueryResponse>;
  abstract query(templateString: TemplateStringsArray, ...params: any[]): Promise<QueryResponse>;
  escape(param: any): string {
    return SqlString.escape(param);
  }
  abstract rawCommand(sql: string): Promise<CommandResponse>;
  abstract command(templateString: TemplateStringsArray, ...params: any[]): Promise<CommandResponse>;
  formatQuery(str: TemplateStringsArray, ...params: any[]): string {
    let ret = str[0];
    for (let i = 0; i < params.length; i++) {
      if (typeof params[i] === "function") ret += params[i]();
      else if (Array.isArray(params[i])) ret += params[i].map((it: any) => this.escape(it)).join(", ");
      else ret += this.escape(params[i]);
      ret += str[i + 1];
    }
    return ret;
  }
}

export abstract class SQLTransaction extends SQLClient {
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;
}

export abstract class DBClient extends SQLClient {
  abstract transaction(): Promise<SQLTransaction>;
  abstract release(): void;
}
