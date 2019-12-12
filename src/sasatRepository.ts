import { getDbClient } from './db/getDbClient';
import { CommandResponse, SQLExecutor } from './db/dbClient';
import { Condition, conditionToSql } from './condition';
import * as SqlString from 'sqlstring';
import { SasatError } from './error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Repository<Entity extends Record<string, any>, Creatable extends Record<string, any>> {
  create(entity: Creatable): Promise<CommandResponse>;
  list(): Promise<Entity[]>;
  update(entity: Entity): Promise<CommandResponse>;
  delete(entity: Entity): Promise<CommandResponse>;
  find(condition: Condition<Entity>): Promise<Entity[]>;
}

export abstract class SasatRepository<Entity, Creatable> implements Repository<Entity, Creatable> {
  protected abstract tableName: string;
  protected abstract primaryKeys: string[];
  constructor(protected client: SQLExecutor = getDbClient()) {}

  async create(entity: Creatable) {
    const columns: string[] = [];
    const values: string[] = [];
    Object.entries(entity).forEach(([column, value]) => {
      columns.push(column);
      values.push(value);
    });
    return this.client.rawCommand(
      `INSERT INTO ${this.tableName}(${columns.map(it => SqlString.escapeId(it)).join(', ')}) VALUES (${values
        .map(SqlString.escape)
        .join(', ')})`,
    );
  }

  async delete(entity: Entity) {
    return this.client.rawCommand(
      `DELETE FROM ${this.tableName} WHERE ${this.getWhereClauseIdentifiedByPrimaryKey(entity)}`,
    );
  }

  async find(condition: Omit<Condition<Entity>, 'from'>): Promise<Entity[]> {
    const result = await this.client.rawQuery(conditionToSql({ ...condition, from: this.tableName }));
    return result.map(it => this.resultToEntity(it));
  }

  async list(select?: Array<keyof Entity>): Promise<Entity[]> {
    const result = await this.client.rawQuery(
      `SELECT ${select ? select.map(it => SqlString.escapeId(it)).join(', ') : '*'} FROM ${this.tableName}`,
    );
    return result.map(it => this.resultToEntity(it));
  }

  // TODO & primaryKey
  update(entity: Partial<Entity>): Promise<CommandResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = this.objToSql(entity).join(', ');
    return this.client.rawCommand(
      `UPDATE ${this.tableName} SET ${values} WHERE ${this.getWhereClauseIdentifiedByPrimaryKey(entity)}`,
    );
  }

  protected resultToEntity(obj: { [key: string]: string }): Entity {
    return (obj as unknown) as Entity;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private objToSql(obj: Record<string, any>): string[] {
    return Object.entries(obj).map(([column, value]) => `${SqlString.escapeId(column)} = ${SqlString.escape(value)}`);
  }

  private getWhereClauseIdentifiedByPrimaryKey(entity: Partial<Entity>) {
    return (
      this.primaryKeys
        .map(it => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((entity as any)[it] === undefined) throw new SasatError('Require Primary Key');
          return it;
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(it => `${SqlString.escapeId(it)} = ${SqlString.escape((entity as any)[it])}`)
        .join(' AND ')
    );
  }
}
