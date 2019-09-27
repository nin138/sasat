import { TableInfo } from '../../migration/table/tableInfo';
import { GqlQuery, GqlSchema } from './types';
import { columnTypeToGqlPrimitive, createGqlType } from './func/createType';
import { getFindQueries, QueryInfo } from '../func/getFindQueries';
import { generateTypeDefs } from './generateTypeDefs';
import { getColumnType } from '../func/getColumnTypes';
import { toFunctionName } from '../func/toFunctionName';
import { plural } from 'pluralize';
import { getEntityName } from '../entity/entity';

const getReturnType = (info: QueryInfo) => (info.unique ? info.entity : `[${info.entity}]`);

const getGqlQueries = (table: TableInfo, tables: TableInfo[]): GqlQuery[] => {
  return getFindQueries(table).map(it => ({
    name: toFunctionName(it.keys, `find${it.entity}By`),
    params: it.keys.map(key => ({
      name: key,
      type: columnTypeToGqlPrimitive(getColumnType(table.tableName, key, tables)),
    })),
    returnType: getReturnType(it),
  }));
};

export const generateGqlString = (tables: TableInfo[]) => {
  const queries: GqlQuery[] = tables.map(it => ({
    name: plural(it.tableName),
    params: [],
    returnType: `[${getEntityName(it)}]`,
  }));

  const findQueries: GqlQuery[] = tables.map(it => getGqlQueries(it, tables)).flat();
  const schema: GqlSchema = {
    types: tables.map(createGqlType),
    queries: queries.concat(findQueries),
  };
  return {
    typeDefs: generateTypeDefs(schema),
  };
};
