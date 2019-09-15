import { DataStoreBuilder } from "./dataStore";

export interface SasatMigration {
  up: (store: DataStoreBuilder) => void;

  /* TODO IMPL
  // down: (store: DataStoreBuilder) => void;
  // beforeUp?: () => void;
  // afterUp?: () => void;
  // beforeDown?: () => void;
  // afterDown?: () => void;
  */
}
