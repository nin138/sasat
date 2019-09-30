import { GqlQuery, GqlSchema } from './types';
import { columnTypeToGqlPrimitive, createGqlType } from './func/createType';
import { getFindQueries, QueryInfo } from '../func/getFindQueries';
import { generateTypeDefs } from './generateTypeDefs';
import { toFunctionName } from '../func/toFunctionName';
import { plural } from 'pluralize';
import { TableGenerator } from '../store';

const getReturnType = (info: QueryInfo) => (info.unique ? info.entity : `[${info.entity}]`);

const getGqlQueries = (table: TableGenerator): GqlQuery[] => {
  return getFindQueries(table).map(it => ({
    name: toFunctionName(it.keys, `find${it.entity}By`),
    params: it.keys.map(key => ({
      name: key,
      type: columnTypeToGqlPrimitive(table.column(key).info.type),
    })),
    returnType: getReturnType(it),
  }));
};

export const generateGqlString = (tables: TableGenerator[]) => {
  const queries: GqlQuery[] = tables.map(it => ({
    name: plural(it.tableName),
    params: [],
    returnType: `[${it.entityName()}]`,
  }));

  const findQueries: GqlQuery[] = tables.map(it => getGqlQueries(it)).flat();
  const schema: GqlSchema = {
    types: tables.map(createGqlType),
    queries: queries.concat(findQueries),
  };
  return {
    typeDefs: generateTypeDefs(schema),
  };
};
