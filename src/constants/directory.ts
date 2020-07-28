import * as path from 'path';

const GeneratedDirName = '__generated__';
const EntityDirName = 'entities';
const RepositoryDirName = 'repositories';
const GeneratedRepositoryDirName = 'repositories';
export const EntityPath = `/${GeneratedDirName}/${EntityDirName}/`;
export const RepositoryPath = `/${RepositoryDirName}/`;
export const GeneratedRepositoryPath = `/${GeneratedDirName}/${GeneratedRepositoryDirName}/`;

export const getGeneratedRepositoryPath = (
  fromPath: string,
  entityName: string,
) => path.relative(fromPath, `${GeneratedRepositoryPath}${entityName}`);

export const getEntityPath = (fromPath: string, entityName: string) =>
  path.relative(fromPath, `${EntityPath}${entityName}`);
