import path from 'path';
import {
  getMigrationFileDir,
  getMigrationFileNames,
} from './getMigrationFiles.js';
import { build } from 'esbuild';

export const changeExtTsToJs = (fileName: string) =>
  fileName.slice(0, -3) + '.mjs';

export const compileMigrationFiles = () => {
  const tsFiles = getMigrationFileNames();
  const compiles = tsFiles.map(async fileName => {
    const filePath = path.join(getMigrationFileDir(), fileName);
    const r = await build({
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
