import { GqlQuery, GqlSchema } from './types';
import { columnTypeToGqlPrimitive } from './func/createType';
import { getFindQueries, QueryInfo } from '../func/getFindQueries';
import { generateTypeDefs } from './generateTypeDefs';
import { plural } from 'pluralize';
import { TableGenerator } from '../store';
import { camelize } from '../../util';

const getReturnType = (info: QueryInfo) => (info.unique ? info.entity : `[${info.entity}]`);

const getGqlQueries = (table: TableGenerator): GqlQuery[] => {
  const toFunctionName = (keys: string[], prefix?: string) => camelize(prefix + '_' + keys.join('And_'));

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
    types: tables.map(it => it.createGqlType()),
    queries: queries.concat(findQueries),
  };
  return {
    typeDefs: generateTypeDefs(schema),
  };
};
