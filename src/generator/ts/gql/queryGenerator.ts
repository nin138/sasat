import {TsFile} from '../file.js';
import {PropertyAssignment} from '../code/node/propertyAssignment.js';
import {Directory} from '../../../constants/directory.js';
import {tsg} from '../code/factory.js';
import {RepositoryNode} from '../../../parser/node/repositoryNode.js';
import {QueryNode} from '../../../parser/node/gql/queryNode.js';
import {Parameter} from "../code/node/parameter.js";
import {TsStatement} from "../code/abstruct/statement.js";

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
    ).addImport(['GraphQLResolveInfo'], 'graphql');
  }

  private static createParams(node: RepositoryNode, query: QueryNode): Parameter[] {

    if (query.queryParams.length === 0)
      return [
        tsg.parameter('_1', tsg.typeRef('unknown')),
        tsg.parameter('_2', tsg.typeRef('unknown')),
        tsg.parameter('_3', tsg.typeRef('unknown')),
        tsg.parameter('info', tsg.typeRef('GraphQLResolveInfo')),
      ];
    if (query.isList) {
      return [
        tsg.parameter('_1', tsg.typeRef('unknown')),
        tsg.parameter('params', tsg.unionType([query.queryParams[0].type.toTsType(), tsg.typeRef('null')])),
        tsg.parameter('_2', tsg.typeRef('unknown')),
        tsg.parameter('info', tsg.typeRef('GraphQLResolveInfo')),
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
      tsg.parameter('_2', tsg.typeRef('unknown')),
      tsg.parameter('info', tsg.typeRef('GraphQLResolveInfo')),
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
          ),
      ),
    );
  }

  private listQuery(node: RepositoryNode, query: QueryNode): PropertyAssignment {
    const fields = tsg.identifier('fields');
    const ds = tsg
      .new(
        tsg
          .identifier(node.entityName.dataSourceName())
          .importFrom(
            Directory.dbDataSourcePath(
              Directory.paths.generated,
              node.entityName,
            ),
          ),
      );
    const params = tsg.identifier('params');
    const statements: TsStatement[] = [
      tsg.variable('const', fields,
        tsg
          .identifier('gqlResolveInfoToField')
          .importFrom('sasat')
          .call(tsg.identifier('info'))
          .as(node.entityName.fieldTypeRef(Directory.paths.generated))
      ),
      tsg.if(
        params,
        tsg.return(
          ds
            .property('findPageable')
            .call(
              tsg.object(
                tsg.propertyAssign(
                  'numberOfItem', params.property('numberOfItem')
                ),
                tsg.propertyAssign(
                  'offset', params.property('offset'),
                ),
              ),
              fields
            )
        )
      ),
      tsg.return(
        ds
          .property(query.repoMethodName)
          .call(fields)
      )
    ]
    return tsg.propertyAssign(
      query.queryName,
      tsg.arrowFunc(
        QueryGenerator.createParams(node, query),
        undefined,
        tsg.block(...statements),
      ),
    );
  }

  private entity(node: RepositoryNode): PropertyAssignment[] {
    return node.queries.map(it => (it.isList ? this.listQuery : this.query)(node, it));
  }
}
