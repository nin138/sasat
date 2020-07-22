export const GeneratedDirName = '__generated__';
export const generatedRepositoryPath = (entityName: string) =>
  `${GeneratedDirName}/repositories/${entityName}`;
export const entityPath = (entityName: string) =>
  `${GeneratedDirName}/entities/${entityName}`;
