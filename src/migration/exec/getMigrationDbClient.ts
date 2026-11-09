import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runInThisContext } from "node:vm";
import { build } from "esbuild";
import { getMigrationOutputDir } from "../../config/config.js";
import type { DBClient } from "../../db/connectors/dbClient.js";
import { getDbClient } from "../../db/getDbClient.js";

/** Use the application-owned client without writing compiled files beside it. */
export async function getMigrationDbClient(): Promise<DBClient> {
  const filename = path.resolve(getMigrationOutputDir(), "dbClient.ts");
  if (!existsSync(filename)) return getDbClient();
  const result = await build({
    entryPoints: [filename],
    bundle: true,
    packages: "external",
    platform: "node",
    target: "node22",
    format: "cjs",
    supported: { "dynamic-import": false },
    write: false,
    logLevel: "silent",
    define: { "import.meta.url": JSON.stringify(pathToFileURL(filename).href) },
    plugins: [
      {
        name: "migration-client",
        setup(builder) {
          builder.onResolve({ filter: /^server-only$/ }, () => ({
            path: "server-only",
            namespace: "empty",
          }));
          builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({
            contents: "",
            loader: "js",
          }));
        },
      },
    ],
  });
  // The CLI and application must share Sasat's configuration, including when
  // the CLI runs as ESM or directly from source and the client is compiled to CJS.
  const sasat = await import("../../index.js");
  const require = createRequire(filename);
  const load = Object.assign(
    (name: string) => (name === "sasat" ? sasat : require(name)),
    require,
  );
  const module = {
    exports: {} as { getDbClient?: () => DBClient | Promise<DBClient> },
  };
  const evaluate = runInThisContext(
    `(function(exports, require, module, __filename, __dirname) {\n${result.outputFiles[0].text}\n})`,
    { filename },
  );
  evaluate(module.exports, load, module, filename, path.dirname(filename));
  if (typeof module.exports.getDbClient !== "function")
    throw new Error("migration.out/dbClient.ts must export getDbClient");
  return module.exports.getDbClient();
}
