import { getDbClient } from './db/getDbClient';
import { CommandResponse, SQLClient, SQLExecutor, SqlValueType } from './db/dbClient';
import { formatQuery } from './db/formatQuery';
import { Condition, orderToSQL, whereToSQL } from './condition';

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
    const values = Object.values(entity);
    return this.client.rawCommand(
      formatQuery`INSERT INTO ${this.getTableName} (${() => Object.keys(entity)}) VALUES (${values})`,
    );
  }

  async delete(entity: Entity) {
    return this.client.rawCommand(
      `DELETE FROM ${this.getTableName()} WHERE ${this.getWhereClauseIdentifiedByPrimaryKey(entity)}`,
    );
  }

  async find(condition: Condition<Entity>): Promise<Entity[]> {
    const select = condition.select ? condition.select.join(', ') : '*';
    const where = condition.where ? ' WHERE' + whereToSQL(condition.where) : '';
    const order = condition.order ? ' ORDER BY' + orderToSQL(condition.order) : '';
    const limit = condition.limit ? ' LIMIT' + condition.limit : '';
    const offset = condition.offset ? ' OFFSET' : '';
    const result = await this.client.rawQuery(
      `SELECT ${select} FROM ${this.tableName}${where}${order}${limit}${offset}`,
    );
    return result.map(it => this.resultToEntity(it));
  }

  async list(): Promise<Entity[]> {
    const result = await this.client.rawQuery(`SELECT * FROM ${this.tableName}`);
    return result.map(it => this.resultToEntity(it));
  }

  update(entity: Entity) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = this.objToSql(entity as any).join(', ');
    return this.client.rawCommand(
      `UPDATE ${this.getTableName()} SET ${values} WHERE ${this.getWhereClauseIdentifiedByPrimaryKey(entity)}`,
    );
  }

  protected resultToEntity(obj: { [key: string]: string }): Entity {
    return (obj as unknown) as Entity;
  }

  protected getTableName() {
    return this.tableName;
  }

  private objToSql(obj: Record<string, SqlValueType>): string[] {
    return Object.entries(obj).map(([column, value]) => `${column} = ${SQLClient.escape(value)}`);
  }

  private getWhereClauseIdentifiedByPrimaryKey(entity: Entity) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.primaryKeys.map(it => `${it} = ${SQLClient.escape((entity as any)[it])}`).join(' AND ');
  }
}
