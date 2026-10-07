import type { MigrateCommandOption } from "@/cli/commands/migrate.js";
import { Console } from "@/cli/console.js";
import { config } from "@/config/config.js";
import type { QueryResponse, SQLClient } from "@/db/connectors/dbClient.js";
import { sqlFor } from "../../db/sqlGenerator.js";
import { getMigrationFileNames } from "./getMigrationFiles.js";

export enum Direction {
  Up = "up",
  Down = "down",
}

type MigrationRecord = {
  id: number;
  name: string;
  direction: Direction;
};

const calcRunMigrationFileNames = (records: MigrationRecord[]) => {
  const result: string[] = [];
  records.forEach((it) => {
    if (it.direction === Direction.Down) {
      if (result[result.length - 1] !== it.name)
        throw new Error(
          "Invalid migration history: `down` migration must be the same migration as the last `up` migration ",
        );
      result.pop();
      return;
    }
    result.push(it.name);
  });
  return result;
};

export const getCurrentMigration = async (
  client: SQLClient,
  options: MigrateCommandOption,
): Promise<string | undefined> => {
  const generator = sqlFor(client);
  const dialect = generator.dialect;
  const migrationTable = generator.escapeId(config().migration.table);
  const files = getMigrationFileNames();
  if (!options.dry) {
    const query = generator.migrationTable(config().migration.table);
    if (!options.silent) {
      Console.log(
        `creating migration table: ${migrationTable} :: ${Buffer.from(
          migrationTable,
        ).toString("base64")}`,
      );
      Console.log(query);
    }
    await client.rawQuery(query);
  }
  const q = `SELECT name, direction FROM ${migrationTable} ORDER BY id ASC`;
  if (!options.silent) {
    Console.debug(q);
  }
  let result: QueryResponse;
  try {
    result = await client.rawQuery(q);
  } catch (error) {
    // A fresh database has no history yet. Do not create it during a dry run.
    if (
      options.dry &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === (dialect === "postgres" ? "42P01" : "ER_NO_SUCH_TABLE")
    )
      return undefined;
    throw error;
  }
  if (!result.length) return;
  const runs = calcRunMigrationFileNames(
    result as unknown as MigrationRecord[],
  );
  if (runs.length === 0) return;
  runs.forEach((run, i) => {
    if (files[i] !== run)
      throw new Error(`\
Invalid migration order: Migration must be performed in the same order 
Found               : ${files[i]} 
in migration history: ${run}`);
  });
  return runs[runs.length - 1];
};
