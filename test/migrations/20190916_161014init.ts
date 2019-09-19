import { DataStoreBuilder, SasatMigration } from "../../src";

export class Init implements SasatMigration {
  up: (store: DataStoreBuilder) => void = store => {
    store.createTable("t1", table => {
      table
        .column("c1")
        .int()
        .autoIncrement()
        .unsigned()
        .primary();
      table.column("c2").varchar(50);
      table
        .column("c3")
        .timestamp()
        .defaultCurrentTimeStamp()
        .onUpdateCurrentTimeStamp();
      table
        .column("c4")
        .varchar(20)
        .notNull();
    });
  };
}
