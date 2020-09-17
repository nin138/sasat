import { CommandResponse, DataStoreInfo, getDbClient } from '..';
import { Fields } from './field';
import * as SqlString from 'sqlstring';
import { SasatError } from '../error';
import { appendKeysToQuery, hydrate, ResultRow } from './hydrate';
import { SQLExecutor } from '../db/connectors/dbClient';
import { createQueryResolveInfo } from './query/createQueryResolveInfo';
import { queryToSql } from './query/sql/queryToSql';
import { fieldToQuery } from './query/fieldToQuery';
import { BooleanValueExpression, Query } from './query/query';
import { replaceAliases } from './query/replaceAliases';

export type EntityResult<Entity, Identifiable> = Identifiable & Partial<Entity>;
interface Repository<Entity, Creatable, Identifiable> {
  create(entity: Creatable): Promise<Entity>;
  update(entity: Partial<Entity> & Identifiable): Promise<CommandResponse>;
  delete(entity: Identifiable): Promise<CommandResponse>;
}

export abstract class SasatRepository<Entity, Creatable, Identifiable, EntityFields extends Fields>
  implements Repository<Entity, Creatable, Identifiable> {
  protected abstract maps: DataStoreInfo;
  abstract readonly tableName: string;
  abstract readonly columns: string[];
  protected abstract readonly primaryKeys: string[];
  protected abstract readonly autoIncrementColumn?: string;
  constructor(protected client: SQLExecutor = getDbClient()) {}
  protected abstract getDefaultValueString(): Partial<{ [P in keyof Entity]: Entity[P] | string | null }>;

  protected async query(query: Query): Promise<ResultRow[]> {
    const sql = queryToSql(replaceAliases(query, this.maps.tableInfo));
    return this.client.rawQuery(sql);
  }

  async create(entity: Creatable): Promise<Entity> {
    const columns: string[] = [];
    const values: string[] = [];
    const obj: Entity = ({
      ...this.getDefaultValueString(),
      ...entity,
    } as unknown) as Entity;
    Object.entries(obj).forEach(([column, value]) => {
      columns.push(column);
      values.push(value as string);
    });
    const response = await this.client.rawCommand(
      `INSERT INTO ${this.tableName}(${columns.map(it => SqlString.escapeId(it)).join(', ')}) VALUES (${values
        .map(SqlString.escape)
        .join(', ')})`,
    );
    if (!this.autoIncrementColumn) return obj;
    const map: Record<string, number> = {};
    map[this.autoIncrementColumn] = response.insertId;
    return ({
      ...map,
      ...obj,
    } as unknown) as Entity;
  }

  async delete(entity: Identifiable): Promise<CommandResponse> {
    return this.client.rawCommand(`DELETE FROM ${this.tableName} WHERE ${this.getIdentifiableWhereClause(entity)}`);
  }

  async find2(
    fields?: EntityFields,
    where?: BooleanValueExpression,
    limit?: number,
    offset?: number,
  ): Promise<EntityResult<Entity, Identifiable>[]> {
    const field = fields || { fields: this.columns };
    const query = {
      ...fieldToQuery(this.tableName, field, this.maps.relationMap),
      where,
      limit,
      offset,
    };
    const info = createQueryResolveInfo(this.tableName, field, this.maps.relationMap, this.maps.tableInfo);
    const result = await this.query(appendKeysToQuery(query, this.maps.tableInfo));
    return hydrate(result, info) as EntityResult<Entity, Identifiable>[];
  }

  async first2(
    fields?: EntityFields,
    where?: BooleanValueExpression,
  ): Promise<EntityResult<Entity, Identifiable> | null> {
    const result = await this.find2(fields, where, 1);
    if (result.length !== 0) return result[0];
    return null;
  }

  update(entity: Identifiable & Partial<Entity>): Promise<CommandResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = this.objToSql(entity).join(', ');
    return this.client.rawCommand(
      `UPDATE ${this.tableName} SET ${values} WHERE ${this.getIdentifiableWhereClause(entity)}`,
    );
  }

  protected resultToEntity(obj: { [key: string]: string }): Entity {
    return (obj as unknown) as Entity;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private objToSql(obj: Record<string, any>): string[] {
    return Object.entries(obj).map(([column, value]) => `${SqlString.escapeId(column)} = ${SqlString.escape(value)}`);
  }

  private getIdentifiableWhereClause(entity: Identifiable) {
    return this.primaryKeys
      .map(it => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((entity as any)[it] === undefined) throw new SasatError('Require Identifiable Key');
        return it;
      })
      .map(
        it =>
          `${SqlString.escapeId(it)} = ${SqlString.escape(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (entity as any)[it],
          )}`,
      )
      .join(' AND ');
  }
}
