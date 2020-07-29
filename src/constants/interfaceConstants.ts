export const DataSourceName = 'SasatRepository';
export const baseRepositoryName = () => DataSourceName;
export const creatableInterfaceName = (entityName: string) => `${entityName}Creatable`;
export const identifiableInterfaceName = (entityName: string) => `${entityName}Identifiable`;

export const generatedDataSourceName = (entityName: string) => `Generated${entityName}${DataSourceName}`;
export const dataSourceName = (entityName: string) => `${entityName}${DataSourceName}`;
