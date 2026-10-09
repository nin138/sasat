import type { SasatMigration } from "../front/migration.js";
import type { SerializedStore } from "../serialized/serializedStore.js";

/** Embedded definitions use the same replay/application lifecycle as filesystem migrations. */
export interface MigrationDefinitions {
  files: string[];
  initialSchema: SerializedStore;
  load(name: string): Promise<SasatMigration>;
}
