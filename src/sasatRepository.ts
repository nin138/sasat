import { getDbClient } from './db/getDbClient';
import { CommandResponse, SQLExecutor } from './db/dbClient';
import { SQL, createSQLString } from './sql/condition';
import * as SqlString from 'sqlstring';
import { SasatError } from './error';
import { FieldResolver, ResolveResult, Field } from './runtime/resolveField';
import { hydrate } from './runtime/hydrate';

export type EntityResult<Entity, Identifiable> = Identifiable & Partial<Entity>;
interface Repository<Entity, Creatable, Identifiable> {
  create(entity: Creatable): Promise<Entity>;
  update(entity: Partial<Entity> & Identifiable): Promise<CommandResponse>;
  delete(entity: Identifiable): Promise<CommandResponse>;
  list(): Promise<Entity[]>;
  find(condition: SQL<Entity>): Promise<Entity[]>;
}

export abstract class SasatRepository<Entity, Creatable, Identifiable, EntityFields extends Field>
  implements Repository<Entity, Creatable, Identifiable> {
  protected abstract resolver: FieldResolver;
  abstract readonly tableName: string;
  protected abstract readonly primaryKeys: string[];
  protected abstract readonly autoIncrementColumn?: string;
  constructor(protected client: SQLExecutor = getDbClient()) {}
  protected abstract getDefaultValueString(): Partial<{ [P in keyof Entity]: Entity[P] | string | null }>;

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

  async find(condition: Omit<SQL<Entity>, 'from'>): Promise<Entity[]> {
    const result = await this.client.rawQuery(createSQLString({ ...condition, from: this.tableName }));
    return result.map(it => this.resultToEntity(it));
  }

  async first(condition: Omit<SQL<Entity>, 'from' | 'limit'>): Promise<Entity | null> {
    const result = await this.find({ ...condition, limit: 1 });
    if (result.length !== 0) return result[0];
    return null;
  }

  async find2(
    condition: Omit<SQL<Entity>, 'select' | 'join' | 'from'>,
    fields: EntityFields,
  ): Promise<EntityResult<Entity, Identifiable>[]> {
    const info = this.resolver(fields, this.tableName);
    const sql = {
      ...(condition as SQL<Entity>),
      ...(info.sql as Pick<SQL<Entity>, 'select' | 'join' | 'from'>),
    } as SQL<Entity>;
    const result = await this.client.rawQuery(createSQLString({ ...condition, ...sql }));
    return hydrate(result, [
      { parent: -1, target: 0, property: '', isArray: false, keys: this.primaryKeys, routes: [] },
      ...info.info,
    ]) as EntityResult<Entity, Identifiable>[];
  }

  async first2(
    condition: Pick<SQL<Entity>, 'where' | 'order' | 'offset'>,
    fields: EntityFields,
  ): Promise<EntityResult<Entity, Identifiable> | null> {
    const result = await this.find2({ ...condition, limit: 1 }, fields);
    if (result.length !== 0) return result[0];
    return null;
  }

  async list(select?: Array<keyof Entity>): Promise<Entity[]> {
    const result = await this.client.rawQuery(
      `SELECT ${select ? select.map(it => SqlString.escapeId(it)).join(', ') : '*'} FROM ${this.tableName}`,
    );
    return result.map(it => this.resultToEntity(it));
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
