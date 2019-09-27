import { TableInfo } from '../../migration/table/tableInfo';
import { GqlQuery, GqlSchema } from './types';
import { columnTypeToGqlPrimitive, createGqlType } from './func/createType';
import { getQueries, QueryInfo } from '../func/getQueries';
import { generateTypeDefs } from './generateTypeDefs';
import { getColumnType } from '../func/getColumnTypes';
import { toFunctionName } from '../func/toFunctionName';

const getReturnType = (info: QueryInfo) => (info.unique ? info.entity : `[${info.entity}]`);

const getGqlQueries = (table: TableInfo, tables: TableInfo[]): GqlQuery[] => {
  const queries = getQueries(table);
  return queries.map(it => ({
    name: toFunctionName(it.keys, `find${it.entity}By`),
    params: it.keys.map(key => ({
      name: key,
      type: columnTypeToGqlPrimitive(getColumnType(table.tableName, key, tables)),
    })),
    returnType: getReturnType(it),
  }));
};

export const generateGqlString = (tables: TableInfo[]) => {
  const schema: GqlSchema = {
    types: tables.map(createGqlType),
    queries: tables.map(it => getGqlQueries(it, tables)).flat(),
  };
  return {
    typeDefs: generateTypeDefs(schema),
  };
};
