import { DataStoreBuilder } from "./dataStore";

export interface SasatMigration {
  up: (store: DataStoreBuilder) => void;
  down?: (store: DataStoreBuilder) => void;
  beforeUp?: () => void;
  afterUp?: () => void;
  beforeDown?: () => void;
  afterDown?: () => void;
}
