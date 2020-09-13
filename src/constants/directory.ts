import * as path from 'path';
import { EntityName } from '../entity/entityName';

const GeneratedDirName = '__generated__';
const EntityDirName = 'entities';
const DataSourceDirName = 'repositories';
const GeneratedDataSourceDirName = 'repositories';

const relative = (from: string, to: string) => {
  const result = path.relative(from, to);
  if (result.startsWith('../')) return result;
  return './' + result;
};

const paths = {
  generated: `/${GeneratedDirName}/`,
  entity: `/${GeneratedDirName}/${EntityDirName}/`,
  dataSource: `/${DataSourceDirName}/`,
  generatedDataSource: `/${GeneratedDirName}/${GeneratedDataSourceDirName}/`,
};

class DirectoryResolver {
  readonly paths = paths;
  generatedDataSourcePath = (fromPath: string, entityName: string | EntityName) =>
    relative(fromPath, `${this.paths.generatedDataSource}${entityName}`);
  dataSourcePath = (fromPath: string, entityName: string | EntityName) =>
    relative(fromPath, `${this.paths.dataSource}${entityName.toString()}`);
  entityPath = (fromPath: string, entityName: string | EntityName) =>
    relative(fromPath, `${this.paths.entity}${entityName.toString()}`);
  generatedPath = (fromPath: string, fileName: string) => relative(fromPath, `${this.paths.generated}${fileName}`);
  basePath = (fromPath: string, fileName: string) => relative(fromPath, `/${fileName}`);
}

export const Directory = new DirectoryResolver();
