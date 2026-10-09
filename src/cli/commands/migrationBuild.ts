import { buildMigrationBundle } from "../../migration/exec/buildMigrationBundle.js";
import { compileMigrationFiles } from "../../migration/exec/migrationFileCompiler.js";
import { Console } from "../console.js";

export const migrationBuild = async (
  options: { standalone?: boolean; out?: string } = {},
): Promise<void> => {
  if (options.out && !options.standalone)
    throw new Error("--out requires --standalone");
  Console.log("--migration build started--");
  if (options.standalone) {
    const output = await buildMigrationBundle(options.out);
    Console.log(`Standalone migration: ${output}`);
  } else await compileMigrationFiles();
  Console.success("Done!");
};
