import { getDbClient } from "./db/getDbClient";
import { CommandResponse, SQLClient } from "./db/dbClient";

interface IRepository<Entity, Creatable> {
  create(entity: Creatable): Promise<CommandResponse>;
  list(): Promise<Entity[]>;
  update(entity: Entity): Promise<CommandResponse>;
  delete(entity: Entity): Promise<CommandResponse>;
  findBy(map: { [column: string]: any }): Promise<Entity[]>;
}

export abstract class Repository<Entity, Creatable> implements IRepository<Entity, Creatable> {
  protected client: SQLClient = getDbClient();
  protected abstract tableName: string;
  protected abstract primaryKeys: string[];

  async create(entity: Creatable) {
    const values = Object.values(entity);
    return this.client.command`INSERT INTO ${this.getTableName} (${() => Object.keys(entity)}) VALUES (${values})`;
  }

  async delete(entity: Entity) {
    return this.client.rawCommand(
      `DELETE FROM ${this.getTableName()} WHERE ${this.getWhereClauseIdentifiedByPrimaryKey(entity)}`,
    );
  }

  async findBy(where: { [p: string]: any }): Promise<Entity[]> {
    const condition = this.objToSql(where).join(" AND ");
    const result = await this.client.rawQuery(`SELECT * FROM ${this.getTableName()} WHERE ${condition}`);
    return result.map(it => this.resultToEntity(it));
  }

  async list(): Promise<Entity[]> {
    const result = await this.client.rawQuery(`SELECT * FROM ${this.getTableName()}`);
    return result.map(it => this.resultToEntity(it));
  }

  update(entity: Entity) {
    const values = this.objToSql(entity).join(", ");
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

  private objToSql(obj: any): string[] {
    return Object.entries(obj).map(([column, value]) => `${column} = ${SQLClient.escape(value)}`);
  }

  private getWhereClauseIdentifiedByPrimaryKey(entity: Entity) {
    return this.primaryKeys.map(it => `${it} = ${SQLClient.escape((entity as any)[it])}`).join(" AND ");
  }
}
