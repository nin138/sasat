import type { DatabaseDialect } from "../dialect.js";
import { createSqlGenerator, type SqlGenerator } from "../sqlGenerator.js";
import { type SqlStatement, snapshotStatement } from "../sqlStatement.js";

export type QueryResponse = Array<{ [key: string]: SqlValueType }>;
export interface CommandResponse {
  insertId: number | bigint;
  affectedRows: number;
  changedRows: number;
}

export type SqlValueType = string | number | bigint | boolean | null;

export interface SQLExecutor {
  readonly dialect?: DatabaseDialect;
  readonly sql?: SqlGenerator;
  rawQuery(sql: string): Promise<QueryResponse>;
  rawCommand(sql: string): Promise<CommandResponse>;
}

/** Optional capability for executors implementing native parameter binding. */
export interface ParameterizedSQLExecutor extends SQLExecutor {
  executeQuery(statement: SqlStatement): Promise<QueryResponse>;
  executeCommand(statement: SqlStatement): Promise<CommandResponse>;
}

const noop = () => {};
export abstract class SQLClient implements ParameterizedSQLExecutor {
  constructor(readonly sql: SqlGenerator = createSqlGenerator("mysql")) {}
  get dialect(): DatabaseDialect {
    return this.sql.dialect;
  }
  protected logger: (query: string) => void = noop;
  rawQuery(sql: string): Promise<QueryResponse> {
    this.logger(sql);
    return this.execSql(sql) as Promise<QueryResponse>;
  }

  rawCommand(sql: string): Promise<CommandResponse> {
    this.logger(sql);
    return this.execSql(sql) as Promise<CommandResponse>;
  }

  async executeQuery(statement: SqlStatement): Promise<QueryResponse> {
    const snapshot = snapshotStatement(statement);
    this.logger(snapshot.text);
    return this.execStatement(snapshot, "query") as Promise<QueryResponse>;
  }

  async executeCommand(statement: SqlStatement): Promise<CommandResponse> {
    const snapshot = snapshotStatement(statement);
    this.logger(snapshot.text);
    return this.execStatement(snapshot, "command") as Promise<CommandResponse>;
  }

  protected execStatement(
    _statement: SqlStatement,
    _kind: "query" | "command",
  ): Promise<QueryResponse | CommandResponse> {
    return Promise.reject(
      new Error("This SQL client does not support parameterized statements"),
    );
  }

  query(
    templateString: TemplateStringsArray,
    // biome-ignore lint/suspicious/noExplicitAny: <>
    ...params: any[]
  ): Promise<QueryResponse> {
    return this.rawQuery(this.sql.format(templateString, ...params));
  }

  command(
    templateString: TemplateStringsArray,
    // biome-ignore lint/suspicious/noExplicitAny: <>
    ...params: any[]
  ): Promise<CommandResponse> {
    return this.rawCommand(this.sql.format(templateString, ...params));
  }

  protected abstract execSql(
    sql: string,
  ): Promise<QueryResponse | CommandResponse>;
}

export abstract class SQLTransaction extends SQLClient {
  /** Discard an unsafe session. Pooled connectors must override to destroy it. */
  discard(): Promise<void> {
    return this.rollback();
  }
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;
}

export abstract class DBClient extends SQLClient {
  protected _released: boolean;
  protected constructor(
    logger: (query: string) => void = noop,
    sql: SqlGenerator = createSqlGenerator("mysql"),
  ) {
    super(sql);
    this._released = false;
    this.logger = logger;
  }
  public isReleased(): boolean {
    return this._released;
  }
  abstract transaction(): Promise<SQLTransaction>;
  abstract release(): Promise<void>;
}
