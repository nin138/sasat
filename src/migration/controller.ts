import * as fs from "fs";
import * as path from "path";
import { config } from "../config/config";
import { getDbClient } from "../db/getDbClient";
import { DataStoreMigrator } from "./dataStore";
import * as ts from "typescript";
import { migrate } from "./executer";
export class MigrationController {
  private migrationDir = path.join(process.cwd(), config.migration.dir);

  async init() {
    const currentMigration = await this.getCurrentMigration();
    const store = new DataStoreMigrator();
    const files = fs.readdirSync(this.migrationDir).filter(it => it.split(".").pop() === "ts");
    let execMigrate = !!currentMigration;

    files.forEach((fileName: string) => {
      if (fileName === currentMigration) execMigrate = false;
      const file = fs.readFileSync(path.join(this.migrationDir, fileName)).toString();
      // tslint:disable-next-line
      const Class = eval(ts.transpile(file));
      new Class().up(store);
      if (execMigrate) migrate(store, fileName);
      store.reset();
    });
  }

  private async getCurrentMigration(): Promise<string | undefined> {
    const client = getDbClient();
    await client.rawQuery(
      `CREATE TABLE IF NOT EXISTS ${config.migration.table} (id int auto_increment primary key , name varchar(100) unique not null, migrated_at timestamp default current_timestamp)`,
    );
    const result = await client.rawQuery(`SELECT name FROM ${config.migration.table} ORDER BY id LIMIT 1`);
    return result ? result[0].name : undefined;
  }
}
