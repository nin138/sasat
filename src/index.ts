import { getDbClient } from "./db/getDbClient";

export { DataStoreBuilder } from "./migration/dataStore";
export { SasatMigration } from "./migration/migration";
export { SasatClient } from "./sasat/client";

getDbClient()
  .rawQuery("select * from t1")
  .then(it => {
    console.log(it[1]);
    console.log(it[1].c5);
    console.log(it[1].c6);
    console.log(it[1].c7);
    console.log(typeof it[1].c5);
    console.log(typeof it[1].c6);
    console.log(typeof it[1].c7);
  });
