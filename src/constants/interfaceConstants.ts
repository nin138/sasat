// TODO refactor
export const DataSourceName = 'DataSource';
export const identifiableInterfaceName = (entityName: string): string =>
  `${entityName}Identifiable`;

export const generatedDBDataSourceName = (entityName: string): string =>
  `Generated${entityName}DB${DataSourceName}`;
export const dbDataSourceName = (entityName: string): string =>
  `${entityName}DB${DataSourceName}`;
