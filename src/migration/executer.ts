import { DataStoreMigrator } from "./dataStore";
import { getDbClient } from "../db/getDbClient";
import { config } from "../config/config";
import { SQLClient } from "../db/dbClient";

export const migrate = (store: DataStoreMigrator, migrationName: string) => {
  const sqls = store.getSql();
  getDbClient()
    .transaction()
    .then(async transaction => {
      try {
        sqls.forEach(async sql => {
          await transaction.rawQuery(sql);
        });
        await transaction.rawQuery(
          `insert into ${config.migration.table}(name) values (${SQLClient.escape(migrationName)})`,
        );
        await transaction.commit();
      } catch (e) {
        transaction.rollback();
        console.error(e.message);
      }
    });
  console.log(`${migrationName} fin`);
  store.reset();
};
