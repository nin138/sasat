import { DataStore } from './dataStore';

export interface SasatMigration {
  up: (store: DataStore) => void;
  down: (store: DataStore) => void;
  beforeUp?: () => void;
  afterUp?: () => void;
  beforeDown?: () => void;
  afterDown?: () => void;
}
