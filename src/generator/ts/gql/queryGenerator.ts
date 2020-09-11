import { TsFile } from '../file';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { TypeLiteral } from '../code/node/type/typeLiteral';
import { Directory } from '../../../constants/directory';
import { tsg } from '../code/factory';
import { RepositoryNode } from '../../../parser/node/repositoryNode';
import { QueryNode } from '../../../parser/node/gql/queryNode';

export class QueryGenerator {
  generate(nodes: RepositoryNode[]): TsFile {
    return new TsFile(
      tsg
        .variable(
          'const',
          tsg.identifier('query'),
          tsg.object(...nodes.flatMap(node => this.entity(node))),
          tsg.typeRef('IResolverObject').importFrom('graphql-tools'),
        )
        .export(),
    );
  }
  private entity(node: RepositoryNode): PropertyAssignment[] {
    const createParams = (query: QueryNode) => {
      if (query.queryParams.length === 0) return [];
      const paramNames = query.queryParams.map(it => it.name);
      return [
        tsg.parameter('_', new TypeLiteral()),
        tsg.parameter(
          `{ ${paramNames.join(',')} }`,
          node.entityName.getTypeReference(Directory.paths.generated).pick(...paramNames),
        ),
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
                .importFrom(Directory.dataSourcePath(Directory.paths.generated, node.entityName)),
            )
            .property(it.repoMethodName)
            .call(...it.queryParams.map(it => tsg.identifier(it.name))),
        ),
      ),
    );
  }
}
