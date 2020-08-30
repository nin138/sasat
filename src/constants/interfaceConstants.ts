// TODO refactor
export const DataSourceName = 'SasatRepository';
export const baseRepositoryName = (): string => DataSourceName;
export const creatableInterfaceName = (entityName: string): string => `${entityName}Creatable`;
export const identifiableInterfaceName = (entityName: string): string => `${entityName}Identifiable`;

export const generatedDataSourceName = (entityName: string): string => `Generated${entityName}${DataSourceName}`;
export const dataSourceName = (entityName: string): string => `${entityName}${DataSourceName}`;
