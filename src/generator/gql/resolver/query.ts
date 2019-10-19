import { TableGenerator } from '../../store';
import { getGqlQueries } from '../gql';
import { toRepoFnName } from '../../repository/repository';

const generateQueryStrings = (tables: TableGenerator[]) => {
  return tables
    .map(table => {
      const queries = getGqlQueries(table);
      return queries.map(query => {
        const params = query.params.map(it => it.name).join(', ');
        return `${query.name}: (_: any, { ${params} }: Pick<${table.entityName()}, ${query.params
          .map(it => `'${it.name}'`)
          .join(' | ')}>) => new ${table.entityName()}Repository().${toRepoFnName(
          query.params.map(it => it.name),
          table,
        )}(${params}),`;
      });
    })
    .flat();
};

export const generateGqlQueryString = (tables: TableGenerator[]) => `\
export const query = {
  ${generateQueryStrings(tables).join('\n  ')}
`;
