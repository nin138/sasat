import * as fs from "fs";
import * as path from "path";
import { config } from "../config/config";
import { getDbClient } from "../db/getDbClient";
import { DataStoreMigrator } from "./dataStore";
import * as ts from "typescript";
import { Console } from "../cli/console";
import { SQLClient } from "../db/dbClient";
import { writeYmlFile } from "../util";
export class MigrationController {
  private static async getCurrentMigration(): Promise<string | undefined> {
    const client = getDbClient();
    await client.rawQuery(
      `CREATE TABLE IF NOT EXISTS ${config.migration.table} (id int auto_increment primary key , name varchar(100) unique not null, migrated_at timestamp default current_timestamp)`,
    );
    const result = await client.rawQuery(`SELECT name FROM ${config.migration.table} ORDER BY id LIMIT 1`);
    return result.length ? result[0].name : undefined;
  }
  private migrationDir = path.join(process.cwd(), config.migration.dir);

  async migrate(): Promise<string> {
    const currentMigration = await MigrationController.getCurrentMigration();
    const store = new DataStoreMigrator();
    const files = fs.readdirSync(this.migrationDir).filter(it => it.split(".").pop() === "ts");
    let execMigrate = !currentMigration;
    for (const fileName of files) {
      this.readMigration(store, fileName);
      if (execMigrate) {
        await this.execMigration(store, fileName);
        Console.log(fileName + " succeeded");
      }
      store.reset();
      if (fileName === currentMigration) execMigrate = true;
    }
    writeYmlFile(config.migration.out, "current_schema.yml", store.serialize());
    return files.pop()!;
  }

  private async execMigration(store: DataStoreMigrator, migrationName: string) {
    const sqls = store.getSql();
    const transaction = await getDbClient().transaction();
    try {
      for (const sql of sqls) await transaction.rawQuery(sql);
      await transaction.rawQuery(
        `insert into ${config.migration.table}(name) values (${SQLClient.escape(migrationName)})`,
      );
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      Console.error(e.message);
    }
    store.reset();
  }

  private readMigration(store: DataStoreMigrator, fileName: string) {
    const file = fs.readFileSync(path.join(this.migrationDir, fileName)).toString();
    // tslint:disable-next-line
    const Class = eval(ts.transpile(file));
    new Class().up(store);
    return store;
  }
}
