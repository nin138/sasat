import {
  CommandResponse,
  DataStoreInfo,
  getDbClient,
  QExpr,
} from '../index.js';
import { Fields } from './field.js';
import { ResultRow } from './dsl/query/sql/hydrate.js';
import { SQLExecutor, SqlValueType } from '../db/connectors/dbClient.js';
import { createQueryResolveInfo } from './dsl/query/createQueryResolveInfo.js';
import { queryToSql } from './dsl/query/sql/queryToSql.js';
import { BooleanValueExpression, Query, Sort } from './dsl/query/query.js';
import { replaceAliases } from './dsl/replaceAliases.js';
import {
  Create,
  createToSql,
  Delete,
  deleteToSql,
  Update,
  updateToSql,
} from './dsl/mutation/mutation.js';
import {createPagingFieldQuery, createQuery, runQuery} from "./sql/runQuery";

export type EntityType = Record<string, SqlValueType>;
export type EntityResult<Entity, Identifiable> = Identifiable & Partial<Entity>;
interface Repository<Entity, Creatable, Identifiable> {
  create(entity: Creatable): Promise<Entity>;
  update(entity: Partial<Entity> & Identifiable): Promise<CommandResponse>;
  delete(entity: Identifiable): Promise<CommandResponse>;
}
export type ListQueryOption = {
  numberOfItem: number;
  offset?: number;
  order?: string;
  asc?: boolean;
};

export abstract class SasatDBDatasource<
  Entity extends EntityType,
  Creatable,
  Identifiable,
  EntityFields extends Fields,
> implements Repository<Entity, Creatable, Identifiable>
{
  protected abstract maps: DataStoreInfo;
  abstract readonly tableName: string;
  abstract readonly fields: string[];
  protected abstract readonly primaryKeys: string[];
  protected abstract readonly autoIncrementColumn?: string;
  constructor(protected client: SQLExecutor = getDbClient()) {}
  protected abstract getDefaultValueString(): Partial<{
    [P in keyof Entity]: Entity[P] | string | null;
  }>;

  protected async query(query: Query): Promise<ResultRow[]> {
    const sql = queryToSql(replaceAliases(query, this.maps.tableInfo));
    return this.client.rawQuery(sql);
  }

  async create(entity: Creatable): Promise<Entity> {
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
    };
    const response = await this.client.rawCommand(
      createToSql(dsl, this.maps.tableInfo),
    );
    if (!this.autoIncrementColumn) return obj;
    return {
      ...obj,
      [this.autoIncrementColumn]: response.insertId,
    } as unknown as Entity;
  }

  update(entity: Identifiable & Partial<Entity>): Promise<CommandResponse> {
    const dsl: Update = {
      table: this.tableName,
      values: Object.entries(entity).map(([column, value]) => ({
        field: column,
        value: value as SqlValueType,
      })),
      where: this.createIdentifiableExpression(entity),
    };
    return this.client.rawCommand(updateToSql(dsl, this.maps.tableInfo));
  }

  async delete(entity: Identifiable): Promise<CommandResponse> {
    const dsl: Delete = {
      table: this.tableName,
      where: this.createIdentifiableExpression(entity),
    };
    return this.client.rawCommand(deleteToSql(dsl, this.maps.tableInfo));
  }

  async first(
    fields?: EntityFields,
    option?: {
      where?: BooleanValueExpression;
      sort?: Sort[];
    },
    context?: any,
  ): Promise<EntityResult<Entity, Identifiable> | null> {
    const result = await this.find(fields, option, context);
    if (result.length !== 0) return result[0];
    return null;
  }

  async find(
    fields: EntityFields = { fields: this.fields } as EntityFields,
    options?: {
      where?: BooleanValueExpression;
      sort?: Sort[];
      limit?: number;
      offset?: number;
    },
    context?: unknown,
  ): Promise<EntityResult<Entity, Identifiable>[]> {
    const query = createQuery(this.tableName, fields, options, this.maps.tableInfo, this.maps.relationMap, context);
    return this.executeQuery(query, fields);
  }

  async findPageable(
    paging: {
      numberOfItem: number;
      where?: BooleanValueExpression;
      offset?: number; // TODO prev, next
      sort?: Sort[];
    },
    fields: EntityFields = { fields: this.fields } as EntityFields,
    options?: {
      where?: BooleanValueExpression;
      sort?: Sort[];
      limit?: number;
      offset?: number;
    },
    context?: unknown,
  ): Promise<EntityResult<Entity, Identifiable>[]> {
    const query = createPagingFieldQuery({
      baseTableName: this.tableName,
      fields,
      tableInfo: this.maps.tableInfo,
      relationMap: this.maps.relationMap,
      pagingOption: paging,
      queryOption: options,
      context,
    })
    return this.executeQuery(query, fields);
  }

  private async executeQuery(
    query: Query,
    fields: EntityFields,
  ): Promise<EntityResult<Entity, Identifiable>[]> {
    const info = createQueryResolveInfo(
      this.tableName,
      fields,
      this.maps.relationMap,
      this.maps.tableInfo,
    );
    return await runQuery(this.client, query, info) as EntityResult<Entity, Identifiable>[];
  }

  private createIdentifiableExpression(entity: Identifiable) {
    const expr = this.primaryKeys.map(it => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (entity as any)[it];
      if (!value) throw new Error(`field ${it} is required`);
      return QExpr.conditions.eq(
        QExpr.field(this.tableName, it),
        QExpr.value(value),
      );
    });
    return QExpr.conditions.and(...expr);
  }
}