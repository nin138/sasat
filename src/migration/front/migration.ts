import { MigrationStore } from './storeMigrator.js';

export interface SasatMigration {
  up: (store: MigrationStore) => void | Promise<void>;
  down: (store: MigrationStore) => void | Promise<void>;
  beforeUp?: () => void | Promise<void>;
  afterUp?: () => void | Promise<void>;
  beforeDown?: () => void | Promise<void>;
  afterDown?: () => void | Promise<void>;
}
