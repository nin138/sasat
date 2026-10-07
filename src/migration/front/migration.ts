import type { SQLExecutor } from "../../db/connectors/dbClient.js";
import type { MigrationStore } from "./storeMigrator.js";

export interface MigrationCommitContext {
  migrationName: string;
  direction: "up" | "down";
}
export interface MigrationHookContext extends MigrationCommitContext {
  /** Use this executor to share the migration's connection and transaction. */
  db: SQLExecutor;
}
export interface SasatMigration {
  /** Replayable definitions: also run during reconstruction, generation and dry runs. */
  up: (store: MigrationStore) => void | Promise<void>;
  down: (store: MigrationStore) => void | Promise<void>;
  beforeUp?: (context: MigrationHookContext) => void | Promise<void>;
  afterUp?: (context: MigrationHookContext) => void | Promise<void>;
  beforeDown?: (context: MigrationHookContext) => void | Promise<void>;
  afterDown?: (context: MigrationHookContext) => void | Promise<void>;
  /** Runs after commit. Failure cannot undo the migration and is not automatically retried. */
  afterCommitUp?: (context: MigrationCommitContext) => void | Promise<void>;
  afterCommitDown?: (context: MigrationCommitContext) => void | Promise<void>;
  skipOnTest?: boolean | undefined;
}
