import { TsFile } from '../file.js';
import { PropertyAssignment } from '../code/node/propertyAssignment.js';
import { Directory } from '../../../constants/directory.js';
import { tsg } from '../code/factory.js';
import { RepositoryNode } from '../../../parser/node/repositoryNode.js';
import { QueryNode } from '../../../parser/node/gql/queryNode.js';

export class QueryGenerator {
  generate(nodes: RepositoryNode[]): TsFile {
    return new TsFile(
      tsg
        .variable(
          'const',
          tsg.identifier('query'),
          tsg.object(...nodes.flatMap(node => this.entity(node))),
          tsg.typeRef('IResolvers').importFrom('@graphql-tools/utils/Interfaces'),
        )
        .export(),
    ).addImport(['GraphQLResolveInfo'], 'graphql');
  }
  private entity(node: RepositoryNode): PropertyAssignment[] {
    const createParams = (query: QueryNode) => {
      if (query.queryParams.length === 0)
        return [
          tsg.parameter('_1', tsg.typeRef('unknown')),
          tsg.parameter('_2', tsg.typeRef('unknown')),
          tsg.parameter('_3', tsg.typeRef('unknown')),
          tsg.parameter('info', tsg.typeRef('GraphQLResolveInfo')),
        ];
      const paramNames = query.queryParams.map(it => it.name);
      return [
        tsg.parameter('_1', tsg.typeRef('unknown')),
        tsg.parameter(
          `{ ${paramNames.join(',')} }`,
          node.entityName.getTypeReference(Directory.paths.generated).pick(...paramNames),
        ),
        tsg.parameter('_2', tsg.typeRef('unknown')),
        tsg.parameter('info', tsg.typeRef('GraphQLResolveInfo')),
      ];
    };
    return node.queries.map(it =>
      tsg.propertyAssign(
        it.queryName,
        tsg.arrowFunc(
          createParams(it),
          undefined,
          tsg
            .new(
              tsg
                .identifier(node.entityName.dataSourceName())
                .importFrom(Directory.dbDataSourcePath(Directory.paths.generated, node.entityName)),
            )
            .property(it.repoMethodName)
            .call(
              ...it.queryParams.map(it => tsg.identifier(it.name)),
              tsg
                .identifier('gqlResolveInfoToField')
                .importFrom('sasat')
                .call(tsg.identifier('info'))
                .as(node.entityName.fieldTypeRef(Directory.paths.generated)),
            ),
        ),
      ),
    );
  }
}
