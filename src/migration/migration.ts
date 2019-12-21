import { MigrationStore } from './storeMigrator';

export interface SasatMigration {
  up: (store: MigrationStore) => void;
  down: (store: MigrationStore) => void;
  beforeUp?: () => void;
  afterUp?: () => void;
  beforeDown?: () => void;
  afterDown?: () => void;
}
