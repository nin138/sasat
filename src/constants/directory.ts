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

export const getGeneratedRepositoryPath = (fromPath: string, entityName: string) =>
  path.relative(fromPath, `${GeneratedRepositoryPath}${entityName}`);

export const getEntityPath = (fromPath: string, entityName: string | EntityName) =>
  path.relative(fromPath, `${EntityPath}${entityName.toString()}`);
