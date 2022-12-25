import { Directory } from '../../../constants/directory.js';
import {
  tsg,
  PropertyAssignment,
  Parameter,
  TsStatement,
  TsFile,
} from '../../../tsg/index.js';
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
        )
        .export(),
    )
      .addImport(['GraphQLResolveInfo'], 'graphql')
      .disableEsLint();
  }

  private static createParams(
    node: RepositoryNode,
    query: QueryNode,
  ): Parameter[] {
    const context = tsg.parameter(
      'context',
      tsg.typeRef('GQLContext').importFrom('../context'),
    );
    const resolveInfo = tsg.parameter(
      'info',
      tsg.typeRef('GraphQLResolveInfo'),
    );
    if (query.queryParams.length === 0 || query.listType === 'all')
      return [
        tsg.parameter('_1', tsg.typeRef('unknown')),
        tsg.parameter('_2', tsg.typeRef('unknown')),
        context,
        resolveInfo,
      ];
    if (query.isList) {
      return [
        tsg.parameter('_1', tsg.typeRef('unknown')),
        tsg.parameter(
          'params',
          tsg.typeLiteral([
            tsg.propertySignature(
              'option',
              query.queryParams[0].type.toTsType(),
              false,
              false,
            ),
          ]),
        ),
        context,
        resolveInfo,
      ];
    }
    const paramNames = query.queryParams.map(it => it.name);
    return [
      tsg.parameter('_1', tsg.typeRef('unknown')),
      tsg.parameter(
        `{ ${paramNames.join(',')} }`,
        node.entityName
          .getTypeReference(Directory.paths.generated)
          .pick(...paramNames),
      ),
      context,
      resolveInfo,
    ];
  }

  private query(node: RepositoryNode, query: QueryNode): PropertyAssignment {
    return tsg.propertyAssign(
      query.queryName,
      tsg.arrowFunc(
        QueryGenerator.createParams(node, query),
        undefined,
        tsg
          .new(
            tsg
              .identifier(node.entityName.dataSourceName())
              .importFrom(
                Directory.dbDataSourcePath(
                  Directory.paths.generated,
                  node.entityName,
                ),
              ),
          )
          .property(query.repoMethodName)
          .call(
            ...query.queryParams.map(it => tsg.identifier(it.name)),
            tsg
              .identifier('gqlResolveInfoToField')
              .importFrom('sasat')
              .call(tsg.identifier('info'))
              .as(node.entityName.fieldTypeRef(Directory.paths.generated)),
            tsg.identifier('undefined'),
            tsg.identifier('context'),
          ),
      ),
    );
  }

  private listQuery(
    node: RepositoryNode,
    query: QueryNode,
  ): PropertyAssignment {
    const fields = tsg.identifier('fields');
    const option = tsg.identifier('option');
    const ds = tsg.new(
      tsg
        .identifier(node.entityName.dataSourceName())
        .importFrom(
          Directory.dbDataSourcePath(
            Directory.paths.generated,
            node.entityName,
          ),
        ),
    );
    const constInfo: TsStatement = tsg.variable(
      'const',
      fields,
      tsg
        .identifier('gqlResolveInfoToField')
        .importFrom('sasat')
        .call(tsg.identifier('info'))
        .as(node.entityName.fieldTypeRef(Directory.paths.generated)),
    );
    const all = () => {
      return [
        constInfo,
        tsg.return(
          ds
            .property(query.repoMethodName)
            .call(
              fields,
              tsg.identifier('undefined'),
              tsg.identifier('context'),
            ),
        ),
      ];
    };
    const pageable = () => {
      return [
        constInfo,
        tsg.variable(
          'const',
          tsg.identifier('{ option }'),
          tsg.identifier('params'),
        ),
        tsg.return(
          ds
            .property('findPageable')
            .call(
              tsg.object(
                tsg.propertyAssign(
                  'numberOfItem',
                  option.property('numberOfItem'),
                ),
                tsg.propertyAssign('offset', option.property('offset')),
              ),
              fields,
              tsg.identifier('undefined'),
              tsg.identifier('context'),
            ),
        ),
      ];
    };

    return tsg.propertyAssign(
      query.queryName,
      tsg.arrowFunc(
        QueryGenerator.createParams(node, query),
        undefined,
        tsg.block(...(query.listType === 'paging' ? pageable() : all())),
      ),
    );
  }

  private entity(node: RepositoryNode): PropertyAssignment[] {
    return node.queries.map(it =>
      (it.isList ? this.listQuery : this.query)(node, it),
    );
  }
}
