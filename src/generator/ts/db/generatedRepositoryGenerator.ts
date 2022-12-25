import {
  TsFile,
  Class,
  ExtendsClause,
  TypeReference,
  PropertyModifiers,
  KeywordTypeNode,
  ArrayType,
  UnionType,
  PropertyAssignment,
  ReturnStatement,
  MethodDeclaration,
  MethodModifiers,
  Parameter,
  TsExpression,
  tsg,
} from '../../../tsg/index.js';
import { Directory } from '../../../constants/directory.js';
import { RepositoryNode } from '../../../parser/node/repositoryNode.js';
import { SqlValueType } from '../../../db/connectors/dbClient.js';

export class GeneratedRepositoryGenerator {
  constructor(private node: RepositoryNode) {}

  generate(): TsFile {
    const node = this.node;
    const entityPath = Directory.entityPath(
      Directory.paths.generatedDataSource.db,
      node.entityName,
    );
    return new TsFile(
      tsg.typeAlias(
        'QueryResult',
        tsg.intersectionType(
          tsg.typeRef('Partial', [
            tsg
              .typeRef(node.entityName.entityWithRelationTypeName())
              .importFrom(
                Directory.generatedPath(
                  Directory.paths.generatedDataSource.db,
                  'relationMap',
                ),
              ),
          ]),
          node.entityName.identifiableTypeReference(
            Directory.paths.generatedDataSource.db,
          ),
        ),
      ),
      new Class(node.entityName.generatedDataSourceName())
        .export()
        .abstract()
        .extends(
          new ExtendsClause(
            tsg.typeRef('BaseDBDataSource', [
              tsg.typeRef(node.entityName.name).importFrom(entityPath),
              tsg
                .typeRef(node.entityName.creatableInterface())
                .importFrom(entityPath),
              tsg
                .typeRef(node.entityName.identifiableInterfaceName())
                .importFrom(entityPath),
              node.entityName.fieldTypeRef(
                Directory.paths.generatedDataSource.db,
              ),
              tsg.typeRef('QueryResult'),
            ]),
          ).addImport(
            ['BaseDBDataSource'],
            Directory.basePath(
              Directory.paths.generatedDataSource.db,
              'baseDBDataSource',
            ),
          ),
        )
        .addProperty(...this.properties(node))
        .addMethod(this.getDefaultValueMethod(node), ...this.findMethods(node)),
    ).disableEsLint();
  }

  // TODO MOVE
  private sqlValueToTsExpression(value: SqlValueType): TsExpression {
    if (typeof value === 'string') {
      return tsg.string(value);
    }
    if (typeof value === 'number') {
      return tsg.number(value);
    }
    return tsg.identifier('null');
  }

  private properties(node: RepositoryNode) {
    return [
      tsg
        .propertyDeclaration('tableName', KeywordTypeNode.string, false)
        .modifiers(tsg.propertyModifiers().readonly())
        .initializer(tsg.string(node.tableName)),
      tsg
        .propertyDeclaration(
          'fields',
          tsg.arrayType(KeywordTypeNode.string),
          false,
        )
        .modifiers(tsg.propertyModifiers().readonly())
        .initializer(
          tsg.array(node.entity.fields.map(it => tsg.string(it.fieldName))),
        ),
      tsg
        .propertyDeclaration(
          'primaryKeys',
          new ArrayType(KeywordTypeNode.string),
          false,
        )
        .modifiers(new PropertyModifiers().readonly().protected())
        .initializer(tsg.array(node.primaryKeys.map(it => tsg.string(it)))),
      tsg
        .propertyDeclaration(
          'autoIncrementColumn',
          new UnionType([KeywordTypeNode.string, KeywordTypeNode.undefined]),
          true,
        )
        .modifiers(new PropertyModifiers().readonly().protected())
        .initializer(
          node.autoIncrementColumn
            ? tsg.string(node.autoIncrementColumn)
            : tsg.identifier('undefined'),
        ),
    ];
  }

  private getDefaultValueMethod(node: RepositoryNode) {
    const properties = node.entity.hasDefaultValueFields().map(it => {
      const fieldToExpression = () => {
        if (it.onCreateCurrentTimestamp) {
          return tsg
            .identifier('getCurrentDateTimeString')
            .addImport(['getCurrentDateTimeString'], 'sasat')
            .call();
        }
        return this.sqlValueToTsExpression(it.defaultValue!);
      };
      return new PropertyAssignment(it.fieldName, fieldToExpression());
    });
    const body = new ReturnStatement(tsg.object(...properties));

    const columns = node.getDefaultValueColumnNames();
    return new MethodDeclaration(
      'getDefaultValueString',
      [],
      columns.length !== 0
        ? tsg.typeRef(node.entityName.name).pick(...columns)
        : tsg.typeRef('Record<string, never>'),
      [body],
    ).modifiers(new MethodModifiers().protected());
  }

  private findMethods(node: RepositoryNode) {
    const qExpr = tsg.identifier('QExpr').importFrom('sasat');
    return node.findMethods().map(it => {
      const exps = it.params.map(it =>
        qExpr
          .property('conditions')
          .property('eq')
          .call(
            qExpr
              .property('field')
              .call(tsg.identifier('tableName'), tsg.string(it.name)),
            qExpr.property('value').call(tsg.identifier(it.name)),
          ),
      );
      const body = [
        tsg.variable(
          'const',
          'tableName',
          tsg.identifier('fields?.tableAlias || "t0"'),
        ),
        tsg.return(
          tsg
            .identifier(it.returnType.isArray ? 'this.find' : 'this.first')
            .call(
              tsg.identifier('fields'),
              tsg.object().addProperties(
                tsg.spreadAssign(tsg.identifier('options')),
                tsg.propertyAssign(
                  'where',
                  qExpr
                    .property('conditions')
                    .property('and')
                    .call(
                      ...exps,
                      tsg.identifier('options?').property('where'),
                    ),
                ),
              ),
              tsg.identifier('context'),
            ),
        ),
      ];
      const returnType = tsg.typeRef('QueryResult');
      return new MethodDeclaration(
        it.name,
        [
          ...it.params.map(it => new Parameter(it.name, it.type.toTsType())),
          new Parameter(
            `fields?`,
            tsg
              .typeRef(`${node.entityName}Fields`)
              .importFrom(
                Directory.generatedPath(
                  Directory.paths.generatedDataSource.db,
                  'fields',
                ),
              ),
          ),
          tsg.parameter(
            'options?',
            it.returnType.isArray
              ? tsg.typeRef('QueryOptions').importFrom('sasat')
              : tsg.typeRef('Omit', [
                  tsg.typeRef('QueryOptions').importFrom('sasat'),
                  tsg.typeRef('"offset" | "limit" | "sort"'),
                ]),
          ),
          tsg.parameter(
            'context?',
            tsg
              .typeRef('GQLContext')
              .importFrom(
                Directory.basePath(
                  Directory.paths.generatedDataSource.db,
                  'context',
                ),
              ),
          ),
        ],
        new TypeReference('Promise', [
          it.returnType.isArray
            ? tsg.arrayType(returnType)
            : tsg.unionType([returnType, tsg.typeRef('null')]),
        ]),
        body,
      );
    });
  }
}
