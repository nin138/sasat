import * as path from 'path';

const GeneratedDirName = '__generated__';
const EntityDirName = 'entities';
const DataSourceDirName = 'dataSources';

export type Directories =
  | 'GENERATED'
  | 'ENTITIES'
  | 'BASE'
  | 'DATA_SOURCES'
  | 'GENERATED_DS';

const relative = (from: string, to: string) => {
  const result = path.posix.relative(from, to);
  if (result.startsWith('../')) return result;
  return './' + result;
};

const GENERATED_PATH = `/${GeneratedDirName}/`;
const paths: Record<Directories, string> = {
  BASE: '/',
  GENERATED: GENERATED_PATH,
  ENTITIES: `${GENERATED_PATH}${EntityDirName}/`,
  DATA_SOURCES: `/${DataSourceDirName}/db/`,
  GENERATED_DS: `${GENERATED_PATH}${DataSourceDirName}/db/`,
};

const resolve = (from: Directories, source: Directories, fileName: string) => {
  return relative(paths[from], paths[source] + fileName);
};

export const Directory = {
  paths,
  resolve,
};
