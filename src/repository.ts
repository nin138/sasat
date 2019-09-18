import { getDbClient } from "./db/getDbClient";
import { SQLClient } from "./db/dbClient";

interface IRepository<Entity, Creatable> {
  create(entity: Creatable): Promise<number>;
  list(): Promise<Entity[]>;
  update(entity: Entity): Promise<void>;
  delete(entity: Entity): Promise<void>;
  findBy(map: { [column: string]: any }): Promise<Entity[]>;
}

export abstract class Repository<Entity, Creatable> implements IRepository<Entity, Creatable> {
  protected client: SQLClient = getDbClient();
  protected abstract tableName: string;
  protected abstract primaryKeys: string[];

  async create(entity: Creatable) {
    const values = Object.values(entity);
    return (await this.client.query`INSERT INTO ${this.getTableName} (${() => Object.keys(entity)}) VALUES (${values})`)
      .affectedRows as number;
  }

  async delete(entity: Entity) {
    return this.client.rawQuery(
      `DELETE FROM ${this.getTableName()} WHERE ${this.getWhereClauseIdentifiedByPrimaryKey(entity)}`,
    );
  }

  findBy(where: { [p: string]: any }): Promise<Entity[]> {
    const condition = this.objToSql(where).join(" AND ");
    return this.client.rawQuery(`SELECT * FROM ${this.getTableName()} WHERE ${condition}`);
  }

  list(): Promise<Entity[]> {
    return this.client.rawQuery(`SELECT * FROM ${this.getTableName()}`);
  }

  update(entity: Entity): Promise<void> {
    const values = this.objToSql(entity).join(", ");
    return this.client.rawQuery(
      `UPDATE ${this.getTableName()} SET ${values} WHERE ${this.getWhereClauseIdentifiedByPrimaryKey(entity)}`,
    );
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

interface User {
  id: number;
  name: string;
  memo?: string;
}

interface CreatableUser {
  id: number;
  name: string;
  memo?: string;
}

export class UserRepository extends Repository<User, CreatableUser> {
  readonly tableName = "user";
  protected primaryKeys: string[] = [];
}
