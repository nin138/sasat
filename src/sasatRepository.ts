import { getDbClient } from './db/getDbClient';
import { CommandResponse, SQLExecutor, SqlValueType } from './db/dbClient';
import { Condition, orderToSQL, whereToSQL } from './condition';
import * as SqlString from 'sqlstring';

interface Repository<Entity, Creatable> {
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
      `INSERT INTO ${this.tableName}(${columns.map(it => SqlString.escapeId(it)).join(', ')}) VALUES ${values
        .map(SqlString.escape)
        .join(', ')}`,
    );
  }

  async delete(entity: Entity) {
    return this.client.rawCommand(
      `DELETE FROM ${this.tableName} WHERE ${this.getWhereClauseIdentifiedByPrimaryKey(entity)}`,
    );
  }

  async find(condition: Condition<Entity>): Promise<Entity[]> {
    const select = condition.select ? condition.select.map(it => SqlString.escapeId(it)).join(', ') : '*';
    const where = condition.where ? ' WHERE ' + whereToSQL(condition.where) : '';
    const order = condition.order ? ' ORDER BY' + orderToSQL(condition.order) : '';
    const limit = condition.limit ? ' LIMIT' + condition.limit : '';
    const offset = condition.offset ? ' OFFSET' : '';
    const result = await this.client.rawQuery(
      `SELECT ${select} FROM ${this.tableName}${where}${order}${limit}${offset}`,
    );
    return result.map(it => this.resultToEntity(it));
  }

  async list(select?: Array<keyof Entity>): Promise<Entity[]> {
    const result = await this.client.rawQuery(
      `SELECT ${select ? select.map(it => SqlString.escapeId(it)).join(', ') : '*'} FROM ${this.tableName}`,
    );
    return result.map(it => this.resultToEntity(it));
  }

  update(entity: Entity) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = this.objToSql(entity as any).join(', ');
    return this.client.rawCommand(
      `UPDATE ${this.tableName} SET ${values} WHERE ${this.getWhereClauseIdentifiedByPrimaryKey(entity)}`,
    );
  }

  protected resultToEntity(obj: { [key: string]: string }): Entity {
    return (obj as unknown) as Entity;
  }

  private objToSql(obj: Record<string, SqlValueType>): string[] {
    return Object.entries(obj).map(([column, value]) => `${SqlString.escapeId(column)} = ${SqlString.escape(value)}`);
  }

  private getWhereClauseIdentifiedByPrimaryKey(entity: Entity) {
    return (
      this.primaryKeys
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(it => `${SqlString.escapeId(it)} = ${SqlString.escape((entity as any)[it])}`)
        .join(' AND ')
    );
  }
}
