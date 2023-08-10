import { CommandResponse, getDbClient, QExpr, RelationMap } from '../index.js';
import { Fields } from './field.js';
import { SQLExecutor, SqlValueType } from '../db/connectors/dbClient.js';
import {
  createQueryResolveInfo,
  TableInfo,
} from './dsl/query/createQueryResolveInfo.js';
import {
  BooleanValueExpression,
  LockMode,
  Query,
  Sort,
} from './dsl/query/query.js';
import {
  Create,
  createToSql,
  Delete,
  deleteToSql,
  Update,
  updateToSql,
} from './dsl/mutation/mutation.js';
import {
  createPagingFieldQuery,
  createQuery,
  PagingOption,
} from './sql/runQuery.js';
import { hydrate, ResultRow } from './dsl/query/sql/hydrate.js';
import { queryToSql } from './dsl/query/sql/queryToSql.js';

export type EntityType = Record<string, SqlValueType>;
export type EntityResult<Entity, Identifiable> = Identifiable & Partial<Entity>;
interface Repository<Entity, Identifiable, Creatable, Updatable> {
  create(entity: Creatable): Promise<Entity>;
  update(entity: Updatable): Promise<CommandResponse>;
  delete(entity: Identifiable): Promise<CommandResponse>;
}
export type ListQueryOption = {
  numberOfItem: number;
  offset?: number;
  order?: string;
  asc?: boolean;
};

export type QueryOptions = {
  where?: BooleanValueExpression;
  sort?: Sort[];
  limit?: number;
  offset?: number;
  lock?: LockMode;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
export abstract class SasatDBDatasource<
  Entity extends EntityType,
  Identifiable extends object,
  Creatable extends EntityType,
  Updatable extends Identifiable,
  EntityFields extends Fields<Entity>,
  QueryResult extends Partial<Entity> & Identifiable,
> implements Repository<Entity, Identifiable, Creatable, Updatable>
{
  protected abstract relationMap: RelationMap<any>; // eslint-disable-line  @typescript-eslint/no-explicit-any
  protected abstract tableInfo: TableInfo;
  abstract readonly tableName: string;
  abstract readonly fields: string[];
  protected abstract readonly primaryKeys: string[];
  protected abstract readonly identifyFields: string[];
  protected abstract readonly autoIncrementColumn?: string | undefined;
  protected queryLogger: (sql: string) => void = noop;
  protected commandLogger: (sql: string) => void = noop;

  constructor(protected client: SQLExecutor = getDbClient()) {}
  protected abstract getDefaultValueString():
    | Partial<{
        [P in keyof Entity]: Entity[P] | string | null | never;
      }>
    | never;

  async create(
    entity: Creatable,
    upsert?: { updateColumns: string[] },
  ): Promise<Entity> {
    const obj: Entity = {
      ...this.getDefaultValueString(),
      ...entity,
    } as unknown as Entity;
    const dsl: Create = {
      table: this.tableName,
      values: Object.entries(obj).map(([column, value]) => ({
        field: column,
        value,
      })),
      upsert: upsert?.updateColumns,
    };
    const sql = createToSql(dsl, this.tableInfo);
    this.commandLogger(sql);
    const response = await this.client.rawCommand(sql);
    if (!this.autoIncrementColumn) return obj;
    return {
      ...obj,
      [this.autoIncrementColumn]: response.insertId,
    } as unknown as Entity;
  }

  async upsert<T extends Creatable & Partial<Entity>>(
    entity: T,
    updateFields: (keyof T)[] = this.primaryKeys,
  ): Promise<Entity> {
    return this.create(entity, {
      updateColumns: this.fieldToColumn(updateFields as string[]),
    });
  }

  update(entity: Updatable): Promise<CommandResponse> {
    const dsl: Update = {
      table: this.tableName,
      values: Object.entries(entity)
        .filter(([, value]) => value !== undefined)
        .map(([column, value]) => ({
          field: column,
          value: value as SqlValueType,
        })),
      where: this.createIdentifiableExpression(entity),
    };
    const sql = updateToSql(dsl, this.tableInfo);
    this.commandLogger(sql);
    return this.client.rawCommand(sql);
  }

  async delete(entity: Identifiable): Promise<CommandResponse> {
    const dsl: Delete = {
      table: this.tableName,
      where: this.createIdentifiableExpression(entity),
    };
    const sql = deleteToSql(dsl);
    this.commandLogger(sql);
    return this.client.rawCommand(sql);
  }

  async first(
    fields?: EntityFields,
    option?: Omit<QueryOptions, 'limit' | 'offset'>,
    context?: unknown,
  ): Promise<QueryResult | null> {
    const result = await this.find(fields, option, context);
    if (result.length !== 0) return result[0];
    return null;
  }

  async find(
    fields: EntityFields = { fields: this.fields } as EntityFields,
    options?: QueryOptions,
    context?: unknown,
  ): Promise<QueryResult[]> {
    const query = createQuery(
      this.tableName,
      fields as Fields<unknown>,
      options,
      this.tableInfo,
      this.relationMap,
      context,
    );
    return this.executeQuery(query, fields);
  }

  async findPageable(
    paging: PagingOption,
    fields: EntityFields = { fields: this.fields } as EntityFields,
    options?: QueryOptions,
    context?: unknown,
  ): Promise<QueryResult[]> {
    const query = createPagingFieldQuery({
      baseTableName: this.tableName,
      fields: fields as Fields<unknown>,
      tableInfo: this.tableInfo,
      relationMap: this.relationMap,
      pagingOption: paging,
      queryOption: options,
      context,
    });
    return this.executeQuery(query, fields);
  }

  private async executeQuery(
    query: Query,
    fields: EntityFields,
  ): Promise<QueryResult[]> {
    const info = createQueryResolveInfo(
      this.tableName,
      fields as Fields<unknown>,
      this.relationMap,
      this.tableInfo,
    );
    const sql = queryToSql(query);
    this.queryLogger(sql);
    const resultRows: ResultRow[] = await this.client.rawQuery(sql);
    return hydrate(resultRows, info) as QueryResult[];
  }

  private createIdentifiableExpression(entity: Identifiable) {
    const expr = this.identifyFields.map(it => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (entity as any)[it];
      if (!value) throw new Error(`field ${it} is required`);
      return QExpr.conditions.eq(
        QExpr.field(
          this.tableName,
          this.tableInfo[this.tableName].columnMap[it],
        ),
        QExpr.value(value),
      );
    });
    return QExpr.conditions.and(...expr);
  }
  getRelationMap() {
    return this.relationMap[this.tableName];
  }

  protected fieldToColumn(fields: string[]) {
    return fields.map(it => this.tableInfo[this.tableName].columnMap[it] || it);
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
