import * as path from 'path';
import { EntityName } from '../entity/entityName';

const GeneratedDirName = '__generated__';
const EntityDirName = 'entities';
const RepositoryDirName = 'repositories';
const GeneratedRepositoryDirName = 'repositories';
export const GeneratedPath = `/${GeneratedDirName}`;
export const EntityPath = `/${GeneratedDirName}/${EntityDirName}/`;
export const RepositoryPath = `/${RepositoryDirName}/`;
export const GeneratedRepositoryPath = `/${GeneratedDirName}/${GeneratedRepositoryDirName}/`;

const relative = (from: string, to: string) => {
  const result = path.relative(from, to);
  if (result.startsWith('../')) return result;
  return './' + result;
};

export const getGeneratedRepositoryPath = (fromPath: string, entityName: string) =>
  relative(fromPath, `${GeneratedRepositoryPath}${entityName}`);

export const getEntityPath = (fromPath: string, entityName: string | EntityName) =>
  relative(fromPath, `${EntityPath}${entityName.toString()}`);

export const getRepositoryPath = (fromPath: string, entityName: string | EntityName) =>
  relative(fromPath, `${RepositoryPath}${entityName.toString()}`);
