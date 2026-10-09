import fs from "node:fs";
import { isBuiltin } from "node:module";
import path from "node:path";
import { build, type Plugin } from "esbuild";
import { getConfiguredDialect } from "../../config/config.js";
import { publishArtifacts } from "../../generatorv2/fs/publishArtifacts.js";
import { readYmlFile } from "../../util/fsUtil.js";
import {
  getMigrationFileDir,
  getMigrationFileNames,
} from "./getMigrationFiles.js";
import { resolveMigrationTarget } from "./getMigrationTarget.js";

/** Compile without evaluating definitions or embedding deployment configuration. */
export async function buildMigrationBundle(
  output = "migration.cjs",
): Promise<string> {
  if (!output.endsWith(".cjs"))
    throw new Error("Standalone migration output must end in .cjs");
  const outfile = path.resolve(output);
  const directory = getMigrationFileDir();
  const files = getMigrationFileNames(directory);
  resolveMigrationTarget(files);
  const dialect = getConfiguredDialect(true);
  const schemaFile = path.join(directory, "initialSchema.yml");
  const initialSchema = fs.existsSync(schemaFile)
    ? readYmlFile(schemaFile)
    : { tables: [] };
  const loaders = files
    .map(
      (name) =>
        `${JSON.stringify(name)}: () => import(${JSON.stringify(path.join(directory, name))})`,
    )
    .join(",\n");
  const plugin: Plugin = {
    name: "standalone-migrations",
    setup(builder) {
      // Standalone artifacts use pg's JavaScript driver. Preserve its optional
      // native getter without leaving a runtime dependency on a native addon.
      builder.onResolve({ filter: /^pg-native$/ }, () => ({
        path: "pg-native",
        namespace: "unsupported-native",
      }));
      builder.onLoad({ filter: /.*/, namespace: "unsupported-native" }, () => ({
        contents:
          'const error = new Error("pg-native is not supported in standalone migrations"); error.code = "MODULE_NOT_FOUND"; throw error;',
        loader: "js",
      }));
      builder.onResolve({ filter: /^server-only$/ }, () => ({
        path: "server-only",
        namespace: "empty",
      }));
      builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({
        contents: "",
        loader: "js",
      }));
    },
  };
  const result = await build({
    stdin: {
      contents: `import { runMigrationBundle } from "sasat/migration/runner";
import driver from ${JSON.stringify(dialect === "mysql" ? "mysql2/promise" : "pg")};
const loaders = {${loaders}};
runMigrationBundle({
  files: ${JSON.stringify(files)},
  initialSchema: ${JSON.stringify(initialSchema)},
  async load(name) {
    if (!Object.hasOwn(loaders, name)) throw new Error("Migration is not embedded: " + name);
    const module = await loaders[name]();
    return new module.default();
  }
}, { dialect: ${JSON.stringify(dialect)}, driver }).catch(error => {
  console.error(error);
  process.exitCode = 1;
});`,
      resolveDir: process.cwd(),
      sourcefile: "sasat-standalone-entry.js",
      loader: "js",
    },
    outfile,
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    write: false,
    metafile: true,
    plugins: [plugin],
    define: { "import.meta.url": "__sasatBundleImportMetaUrl" },
    banner: {
      js: "const __sasatBundleImportMetaUrl = require('node:url').pathToFileURL(__filename).href;",
    },
    legalComments: "inline",
    logLevel: "silent",
  });
  const external = Object.values(result.metafile.outputs)
    .flatMap((item) => item.imports)
    .filter((item) => item.external && !isBuiltin(item.path));
  if (external.length)
    throw new Error(
      `Standalone migrations cannot contain external package imports: ${external.map((item) => item.path).join(", ")}`,
    );
  if (
    Object.keys(result.metafile.inputs).some(
      (input) => path.resolve(input) === outfile,
    )
  )
    throw new Error("Standalone migration output overlaps a source file");
  if (result.outputFiles.length !== 1)
    throw new Error("Standalone migrations must produce exactly one file");
  publishArtifacts([{ path: outfile, content: result.outputFiles[0].text }]);
  return outfile;
}
