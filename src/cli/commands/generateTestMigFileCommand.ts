import { generateTestMigrationFile } from "@/cli/commands/generateTestMigrationFile.js";
import { Console } from "@/cli/console.js";
import { getConfiguredDialect } from "@/config/config.js";
import { createSqlGenerator } from "../../db/sqlGenerator.js";

export async function generateTestMigFileCommand({
  silent,
}: {
  silent: boolean;
}) {
  await generateTestMigrationFile(
    createSqlGenerator(getConfiguredDialect(true)),
  );
  if (!silent) {
    Console.success("successfully generated");
  }
}
