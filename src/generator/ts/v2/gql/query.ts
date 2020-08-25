import { IrGql } from '../../../../ir/gql';
import { IrGqlQueryType } from '../../../../ir/gql/query';

const getImportStatement = (usedEntities: string[]): string[] => {
  return [...new Set(usedEntities)].flatMap(
    it => `\
import { ${it} } from './entity/${it}'
import { ${it}Repository } from '../repository/${it}'
`,
  );
};

export const generateTsGqlQueryString = (ir: IrGql) => {
  const usedEntities: string[] = [];
  const lines = [
    'export const query = {',
    ...ir.queries.map(it => {
      usedEntities.push(it.entity);
      const paramsNames = it.params.map(it => it.name);
      const param =
        it.queryType === IrGqlQueryType.List
          ? '()'
          : `(_: {}, { ${paramsNames.join(', ')} }: Pick<${it.entity}, ${paramsNames.map(it => `'${it}'`).join('|')}>)`;
      return `${it.queryName}: ${param} => new ${it.entity}Repository().${it.repositoryFunctionName}(${paramsNames.join(
        ', ',
      )}),`;
    }),
    '};',
  ];
  return [...getImportStatement(usedEntities), ...lines].join('\n');
};
