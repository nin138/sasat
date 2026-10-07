import path from "node:path";
import { config } from "@/config/config.js";
import type { SasatMigration } from "../front/migration.js";
import type { StoreMigrator } from "../front/storeMigrator.js";
import { Direction } from "./getCurrentMigration.js";
import { changeExtTsToJs } from "./migrationFileCompiler.js";

export const readMigration = async (
  store: StoreMigrator,
  tsFileName: string,
  direction: Direction,
  onRead?: (migration: SasatMigration) => void,
): Promise<StoreMigrator> => {
  const file = path.join(
    process.cwd(),
    config().migration.dir,
    changeExtTsToJs(tsFileName),
  );
  const module = await import(file);
  const instance: SasatMigration = new module.default();
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
