import { TableGenerator } from '../../store';
import { getGqlQueries } from '../gql';
import { toRepoFnName } from '../../repository/repository';
import { plural } from '../../../util/stringUtil';

const generateQueryStrings = (tables: TableGenerator[]) => {
  return tables
    .map(table => {
      const queries = getGqlQueries(table);
      return [
        `${plural(table.tableName)}: () => new ${table.entityName()}Repository().list(),`,
        ...queries.map(query => {
          const params = query.params.map(it => it.name).join(', ');
          return `${query.name}: (_: {}, { ${params} }: Pick<${table.entityName()}, ${query.params
            .map(it => `'${it.name}'`)
            .join(' | ')}>) => new ${table.entityName()}Repository().findBy${toRepoFnName(
            query.params.map(it => it.name),
            table,
          )}(${params}),`;
        }),
      ];
    })
    .flat();
};

const generateMutationStrings = (tables: TableGenerator[]) => {
  return tables.flatMap(table => {
    return [
      `create${table.entityName()}: (_: {}, entity: Creatable${table.entityName()}) => new ${table.entityName()}Repository().create(entity).then(() => true),`,
      `update${table.entityName()}: (_: {}, entity: Partial<${table.entityName()}>) => new ${table.entityName()}Repository().update(entity).then(() => true),`,
    ];
  });
};

const getImportStatements = (tables: TableGenerator[]) => {
  return tables
    .map(it => [
      `import { ${it.entityName()}, Creatable${it.entityName()} } from './entity/${it.tableName}'`,
      `import { ${it.entityName()}Repository } from '../repository/${it.tableName}'`,
    ])
    .flat();
};

export const generateGqlQueryString = (tables: TableGenerator[]) => `\
${getImportStatements(tables).join('\n')}

export const query = {
  ${generateQueryStrings(tables).join('\n  ')}
};

export const mutation = {
  ${generateMutationStrings(tables).join('\n  ')}
};
`;
