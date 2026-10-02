import path from "node:path";
import { config } from "../../config/config.js";
import { StoreMigrator } from "../front/storeMigrator.js";
import { Direction } from "./getCurrentMigration.js";
import { readMigration } from "./readMigrationFile.js";

test.each([
  Direction.Up,
  Direction.Down,
])("awaits %s lifecycle hooks in order", async (direction) => {
  const calls: string[] = [];
  const migrationName = "__virtual_lifecycle_" + direction + ".ts";
  const modulePath = path.join(
    process.cwd(),
    config().migration.dir,
    migrationName.replace(".ts", ".mjs"),
  );
  class Migration {
    skipOnTest = true;
    async beforeUp() {
      calls.push("beforeUp");
    }
    async up(store: StoreMigrator) {
      store.sql("SELECT 1");
      calls.push("up");
    }
    async afterUp() {
      calls.push("afterUp");
    }
    async beforeDown() {
      calls.push("beforeDown");
    }
    async down(store: StoreMigrator) {
      store.sql("SELECT 2");
      calls.push("down");
    }
    async afterDown() {
      calls.push("afterDown");
    }
  }
  jest.doMock(modulePath, () => ({ __esModule: true, default: Migration }), {
    virtual: true,
  });
  const store = StoreMigrator.deserialize({ tables: [] });
  await expect(readMigration(store, migrationName, direction)).resolves.toBe(
    store,
  );
  expect(calls).toEqual(
    direction === Direction.Up
      ? ["beforeUp", "up", "afterUp"]
      : ["beforeDown", "down", "afterDown"],
  );
  expect(store.currentOption.skipOnTest).toBe(true);
});
