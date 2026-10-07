import path from "node:path";
import { build, type Plugin } from "esbuild";
import {
  getMigrationFileDir,
  getMigrationFileNames,
} from "./getMigrationFiles.js";
import { resolveMigrationTarget } from "./getMigrationTarget.js";

export const changeExtTsToJs = (fileName: string) =>
  fileName.slice(0, -3) + ".mjs";

export const compileMigrationFiles = () => {
  const tsFiles = getMigrationFileNames();
  resolveMigrationTarget(tsFiles);
  const stubServerOnlyPlugin: Plugin = {
    name: "stub-server-only",
    setup(build) {
      build.onResolve({ filter: /^server-only$/ }, () => ({
        path: "server-only",
        namespace: "stub-server-only",
      }));
      build.onLoad({ filter: /.*/, namespace: "stub-server-only" }, () => ({
        contents: "",
        loader: "js",
      }));
    },
  };
  const compiles = tsFiles.map(async (fileName) => {
    const filePath = path.join(getMigrationFileDir(), fileName);
    const r = await build({
      entryPoints: [filePath],
      bundle: true,
      // loader: 'ts',
      outfile: changeExtTsToJs(filePath),
      platform: "node",
      format: "esm",
      outExtension: {
        ".js": ".mjs",
      },
      plugins: [stubServerOnlyPlugin],
      banner: {
        js: `import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);                                                                                                                        
import { fileURLToPath as __topLevelFileURLToPath } from 'url';
import { dirname as __topLevelDirname } from 'path';                                                                                                                           
const __filename = __topLevelFileURLToPath(import.meta.url);
const __dirname = __topLevelDirname(__filename);   
`,
      },
    });
    if (r.errors.length !== 0) {
      throw r.errors;
    }
    return fileName;
  });
  return Promise.all(compiles);
};
