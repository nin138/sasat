import { IrGql } from '../../../../ir/gql';
import { IrGqlQueryType } from '../../../../ir/gql/query';
import { TsFile } from '../file';
import { VariableDeclaration } from '../code/node/variableDeclaration';
import { ObjectLiteral } from '../code/node/literal/literal';
import { Identifier } from '../code/node/Identifier';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { ArrowFunction } from '../code/node/arrowFunction';
import { Parameter } from '../code/node/parameter';
import { TypeLiteral } from '../code/node/type/typeLiteral';
import { PropertyAccessExpression } from '../code/node/propertyAccessExpression';
import { RepositoryNode } from '../../../../node/repository';
import { GeneratedPath, getRepositoryPath } from '../../../../constants/directory';
import { plural } from '../../../../util/stringUtil';
import { NewExpression } from '../code/node/newExpression';

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

export class QueryGenerator {
  generate(nodes: RepositoryNode[]): TsFile {
    return new TsFile(
      new VariableDeclaration(
        'const',
        new Identifier('query'),
        new ObjectLiteral(...nodes.flatMap(node => this.createProperty(node))),
      ).export(),
    );
  }

  private createProperty(node: RepositoryNode): PropertyAssignment[] {
    return [
      new PropertyAssignment(
        node.entityName.lowerCase(),
        new ArrowFunction(
          [
            new Parameter('_', new TypeLiteral()),
            new Parameter(
              `{ ${node.primaryKeys.join(',')} }`,
              node.entityName.getTypeReference(GeneratedPath).pick(...node.primaryKeys),
            ),
          ],
          undefined,
          new PropertyAccessExpression(
            new NewExpression(
              new Identifier(node.entityName.dataSourceName()).importFrom(
                getRepositoryPath(GeneratedPath, node.entityName),
              ),
            ),
            node.primaryFindMethod().name,
          ).call(...node.primaryKeys.map(it => new Identifier(it))),
        ),
      ),
      new PropertyAssignment(
        plural(node.entityName.lowerCase()),
        new ArrowFunction(
          [],
          undefined,
          new PropertyAccessExpression(
            new NewExpression(
              new Identifier(node.entityName.dataSourceName()).importFrom(
                getRepositoryPath(GeneratedPath, node.entityName),
              ),
            ),
            'list',
          ).call(),
        ),
      ),
    ];
  }
}
