import path from 'path';
import ts, { CompilerOptions } from 'typescript';
import {
  getMigrationFileDir,
  getMigrationFileNames,
} from './getMigrationFiles.js';
import * as esbuild from 'esbuild';

const getTsConfig = (): CompilerOptions => {
  const configFileName = ts.findConfigFile(
    './',
    ts.sys.fileExists,
    'tsconfig.json',
  );
  if (!configFileName)
    return {
      module: ts.ModuleKind.ESNext,
    };
  const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
  return {
    ...ts.parseJsonConfigFileContent(configFile.config, ts.sys, './').options,
    module: ts.ModuleKind.ESNext,
  };
};

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
