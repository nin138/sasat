import type { SQLExecutor, SqlValueType } from "../db/connectors/dbClient.js";
import {
  type CommandResponse,
  getDbClient,
  qe,
  type RelationMap,
} from "../index.js";
import {
  type Create,
  createToSql,
  type Delete,
  deleteToSql,
  type Update,
  updateToSql,
} from "./dsl/mutation/mutation.js";
import {
  createQueryResolveInfo,
  type TableInfo,
} from "./dsl/query/createQueryResolveInfo.js";
import type {
  BooleanValueExpression,
  Join,
  LockMode,
  Query,
  Sort,
} from "./dsl/query/query.js";
import { hydrate, type ResultRow } from "./dsl/query/sql/hydrate.js";
import { queryToSql } from "./dsl/query/sql/queryToSql.js";
import type { Fields } from "./field.js";
import {
  createPagingFieldQuery,
  createQuery,
  type PagingOption,
} from "./sql/runQuery.js";

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
  join?: Join[];
};

export type QueryOptions = {
  where?: BooleanValueExpression;
  sort?: Sort[];
  limit?: number;
  offset?: number;
  lock?: LockMode;
};

export abstract class SasatDBDatasource<
  Entity extends EntityType,
  Identifiable extends object,
  Creatable extends EntityType,
  Updatable extends Identifiable,
  EntityFields extends Fields<Entity>,
  QueryResult extends Partial<Entity> & Identifiable,
> implements Repository<Entity, Identifiable, Creatable, Updatable>
{
  protected abstract relationMap: RelationMap<unknown>;
  protected abstract tableInfo: TableInfo;
  abstract readonly tableName: string;
  abstract readonly fields: string[];
  protected abstract readonly primaryKeys: string[];
  protected abstract readonly identifyFields: string[];
  protected abstract readonly autoIncrementColumn?: string | undefined;

  constructor(protected client: SQLExecutor = getDbClient()) {}
  protected abstract getDefaultValueString():
    | Partial<{
        [P in keyof Entity]: Entity[P] | string | null | never;
      }>
    | never;

  async create(
    entity: Creatable,
    option?: {
      ignore?: boolean;
      upsert?: { updateColumns: string[] };
    },
  ): Promise<Entity> {
    const obj: Entity = {
      ...this.getDefaultValueString(),
      ...entity,
    } as unknown as Entity;
    const fields = Object.keys(obj);
    const dsl: Create = {
      table: this.tableName,
      fields: fields,
      entities: [fields.map((key) => obj[key])],
      upsert: option?.upsert?.updateColumns,
      ignore: option?.ignore,
    };
    const sql = createToSql(dsl, this.tableInfo);
    const response = await this.client.rawCommand(sql);
    if (!this.autoIncrementColumn) return obj;
    return {
      ...obj,
      [this.autoIncrementColumn]: response.insertId,
    } as unknown as Entity;
  }

  async createBulk(
    entities: Creatable[],
    option?: {
      ignore?: boolean;
      upsert?: { updateColumns: string[] };
    },
  ): Promise<CommandResponse> {
    const objects = entities.map((it) => ({
      ...this.getDefaultValueString(),
      ...it,
    })) as unknown[] as Entity[];
    const keys = Object.keys(objects[0]);
    const values = objects.map((it) => keys.map((key) => it[key]));

    const dsl: Create = {
      table: this.tableName,
      fields: keys,
      entities: values,
      upsert: option?.upsert?.updateColumns,
      ignore: option?.ignore,
    };
    const sql = createToSql(dsl, this.tableInfo);
    return await this.client.rawCommand(sql);
  }

  async upsert<T extends Creatable & Partial<Entity>>(
    entity: T,
    updateFields: (keyof T)[] = this.primaryKeys,
  ): Promise<Entity> {
    return this.create(entity, {
      upsert: {
        updateColumns: this.fieldToColumn(updateFields as string[]),
      },
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
    return this.client.rawCommand(sql);
  }

  updateWhere(
    update: Omit<Updatable, keyof Identifiable>,
    condition: BooleanValueExpression,
  ): Promise<CommandResponse> {
    const dsl: Update = {
      table: this.tableName,
      values: Object.entries(update)
        .filter(([, value]) => value !== undefined)
        .map(([column, value]) => ({
          field: column,
          value: value as SqlValueType,
        })),
      where: condition,
    };
    const sql = updateToSql(dsl, this.tableInfo);
    return this.client.rawCommand(sql);
  }

  async delete(entity: Identifiable): Promise<CommandResponse> {
    return this.deleteWhere(this.createIdentifiableExpression(entity));
  }

  async deleteWhere(
    condition: BooleanValueExpression,
  ): Promise<CommandResponse> {
    const dsl: Delete = {
      table: this.tableName,
      where: condition,
    };
    const sql = deleteToSql(dsl);
    return this.client.rawCommand(sql);
  }

  async first(
    fields?: EntityFields,
    option?: QueryOptions,
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
    const resultRows: ResultRow[] = await this.client.rawQuery(sql);
    return hydrate(resultRows, info) as QueryResult[];
  }

  private createIdentifiableExpression(entity: Identifiable) {
    const expr = this.identifyFields.map((it) => {
      // biome-ignore lint/suspicious/noExplicitAny: <>
      const value = (entity as any)[it];
      if (!value) throw new Error(`field ${it} is required`);
      return qe.eq(
        qe.field(this.tableName, this.tableInfo[this.tableName].columnMap[it]),
        qe.value(value),
      );
    });
    return qe.and(...expr);
  }
  getRelationMap() {
    return this.relationMap[this.tableName];
  }

  protected fieldToColumn(fields: string[]) {
    return fields.map(
      (it) => this.tableInfo[this.tableName].columnMap[it] || it,
    );
  }
}
