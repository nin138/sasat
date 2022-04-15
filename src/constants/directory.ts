import * as path from 'path';
import { EntityName } from '../parser/node/entityName.js';

const GeneratedDirName = '__generated__';
const EntityDirName = 'entities';
const DataSourceDirName = 'dataSources';
const GeneratedDataSourceDirName = 'dataSources';

const relative = (from: string, to: string) => {
  const result = path.relative(from, to);
  if (result.startsWith('../')) return result;
  return './' + result;
};

const dataSourcePath = `/${DataSourceDirName}/`;
const generatedDataSourcePath = `/${GeneratedDirName}/${GeneratedDataSourceDirName}/`;
const paths = {
  generated: `/${GeneratedDirName}/`,
  entity: `/${GeneratedDirName}/${EntityDirName}/`,
  dataSource: {
    db: dataSourcePath + 'db/',
  },
  generatedDataSource: {
    db: generatedDataSourcePath + 'db/',
  },
};

class DirectoryResolver {
  readonly paths = paths;
  generatedDBDataSourcePath = (fromPath: string, entityName: string | EntityName) =>
    relative(fromPath, `${this.paths.generatedDataSource.db}${entityName}`);
  dbDataSourcePath = (fromPath: string, entityName: string | EntityName) =>
    relative(fromPath, `${this.paths.dataSource.db}${entityName.toString()}`);
  entityPath = (fromPath: string, entityName: string | EntityName) =>
    relative(fromPath, `${this.paths.entity}${entityName.toString()}`);
  generatedPath = (fromPath: string, fileName: string) => relative(fromPath, `${this.paths.generated}${fileName}`);
  basePath = (fromPath: string, fileName: string) => relative(fromPath, `/${fileName}`);
}

export const Directory = new DirectoryResolver();
