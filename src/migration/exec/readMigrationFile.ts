import path from "node:path";
import { getMigrationDirectory } from "@/config/config.js";
import type { SasatMigration } from "../front/migration.js";
import type { StoreMigrator } from "../front/storeMigrator.js";
import { Direction } from "./getCurrentMigration.js";
import type { MigrationDefinitions } from "./migrationDefinitions.js";

export const changeExtTsToJs = (fileName: string) =>
  fileName.slice(0, -3) + ".mjs";

export const readMigration = async (
  store: StoreMigrator,
  tsFileName: string,
  direction: Direction,
  onRead?: (migration: SasatMigration) => void,
  definitions?: MigrationDefinitions,
): Promise<StoreMigrator> => {
  const load = async () => {
    const file = path.join(
      process.cwd(),
      getMigrationDirectory(),
      changeExtTsToJs(tsFileName),
    );
    const module = await import(file);
    return new module.default() as SasatMigration;
  };
  const instance = definitions
    ? await definitions.load(tsFileName)
    : await load();
  if (direction === Direction.Up) {
    await instance.up(store);
  } else {
    await instance.down(store);
  }
  store.currentOption = {
    skipOnTest: instance.skipOnTest ?? false,
  };
  onRead?.(instance);
  return store;
};
