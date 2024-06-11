import path from 'path';
import {
  getMigrationFileDir,
  getMigrationFileNames,
} from './getMigrationFiles.js';
import * as esbuild from 'esbuild';

export const changeExtTsToJs = (fileName: string) =>
  fileName.slice(0, -3) + '.mjs';

export const compileMigrationFiles = () => {
  const tsFiles = getMigrationFileNames();
  const compiles = tsFiles.map(async fileName => {
    const filePath = path.join(getMigrationFileDir(), fileName);
    const r = await esbuild.build({
      entryPoints: [filePath],
      bundle: true,
      // loader: 'ts',
      outfile: changeExtTsToJs(filePath),
      platform: 'node',
      format: 'esm',
      outExtension: {
        '.js': '.mjs',
      },
      banner: {
        js: `
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
`,
      },
    });
    if (r.errors.length !== 0) {
      throw r.errors;
    }
    // const file = await fse.readFile(filePath);
    // const src = ts.transpile(file.toString(), getTsConfig()).trim();
    // await fse.outputFile(changeExtTsToJs(filePath), src);
    return fileName;
  });
  return Promise.all(compiles);
};
