import { GqlMutation, GqlParam, GqlQuery, GqlSchema } from './types';
import { columnTypeToGqlPrimitive } from './sasatToGqlType';
import { getFindQueries, QueryInfo } from '../func/getFindQueries';
import { generateTypeDefs } from './generateTypeDefs';
import { TableGenerator } from '../store';
import { camelize, plural } from '../../util/stringUtil';
import { generateGqlQueryString } from './resolver/query';
import { getResolverString } from './resolver/generateResolver';

const getReturnType = (info: QueryInfo) => (info.unique ? info.entity : `[${info.entity}]`);

export const getGqlQueries = (table: TableGenerator): GqlQuery[] => {
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
  const mutations: GqlMutation[] = tables.map(table => {
    return {
      modelName: table.entityName(),
      creatable: table.columns.map(
        it => new GqlParam(it.name, columnTypeToGqlPrimitive(it.info.type), it.isNullableOnCreate()),
      ),
      pKeys: table.primaryKey.map(it => new GqlParam(it, columnTypeToGqlPrimitive(table.column(it).info.type), false)),
      updatable: table.columns
        .filter(column => !table.isPrimary(column.name))
        .map(column => new GqlParam(column.name, columnTypeToGqlPrimitive(column.info.type), true)),
    };
  });
  const schema: GqlSchema = {
    types: tables.map(it => it.createGqlType()),
    queries: queries.concat(findQueries),
    mutations,
  };
  return {
    typeDefs: generateTypeDefs(schema),
    query: generateGqlQueryString(tables),
    resolver: getResolverString(),
  };
};
