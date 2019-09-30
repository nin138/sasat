import { getDbClient } from './db/getDbClient';
import { CommandResponse, SQLClient, SQLExecutor, SqlValueType } from './db/dbClient';
import { formatQuery } from './db/formatQuery';

interface Repository<Entity, Creatable> {
  create(entity: Creatable): Promise<CommandResponse>;
  list(): Promise<Entity[]>;
  update(entity: Entity): Promise<CommandResponse>;
  delete(entity: Entity): Promise<CommandResponse>;
  findBy(map: { [column: string]: SqlValueType }): Promise<Entity[]>;
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

  async findBy(where: { [key: string]: SqlValueType }): Promise<Entity[]> {
    const condition = this.objToSql(where).join(' AND ');
    const result = await this.client.rawQuery(`SELECT * FROM ${this.getTableName()} WHERE ${condition}`);
    return result.map(it => this.resultToEntity(it));
  }

  async list(): Promise<Entity[]> {
    const result = await this.client.rawQuery(`SELECT * FROM ${this.getTableName()}`);
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
