import { MigrationStore } from './storeMigrator.js';

export interface SasatMigration {
  up: (store: MigrationStore) => void;
  down: (store: MigrationStore) => void;
  beforeUp?: () => void;
  afterUp?: () => void;
  beforeDown?: () => void;
  afterDown?: () => void;
}
