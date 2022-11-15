import path from 'path';
import ts from 'typescript';
import fse from 'fs-extra';
import {
  getMigrationFileDir,
  getMigrationFileNames,
} from './getMigrationFiles.js';

const getTsConfig = () => {
  const configFileName = ts.findConfigFile(
    './',
    ts.sys.fileExists,
    'tsconfig.json',
  );
  if (!configFileName) return undefined;
  const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
  return ts.parseJsonConfigFileContent(configFile.config, ts.sys, './').options;
};

export const changeExtTsToJs = (fileName: string) =>
  fileName.slice(0, -3) + '.mjs';

export const compileMigrationFiles = () => {
  const tsFiles = getMigrationFileNames();
  const compiles = tsFiles.map(async fileName => {
    const filePath = path.join(getMigrationFileDir(), fileName);
    const file = await fse.readFile(filePath);
    const src = ts.transpile(file.toString(), getTsConfig()).trim();
    await fse.outputFile(changeExtTsToJs(filePath), src);
    return fileName;
  });
  return Promise.all(compiles);
};
