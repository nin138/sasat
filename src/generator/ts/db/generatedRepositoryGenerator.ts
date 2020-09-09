import { RepositoryNode } from '../../../node/repositoryNode';
import { TsFile } from '../file';
import { Directory } from '../../../constants/directory';
import { Class } from '../code/node/class';
import { ExtendsClause } from '../code/node/extendsClause';
import { TypeReference } from '../code/node/type/typeReference';
import { baseRepositoryName } from '../../../constants/interfaceConstants';
import { SqlValueType } from '../../../db/dbClient';
import { PropertyModifiers } from '../code/node/modifier/propertyModifiers';
import { KeywordTypeNode } from '../code/node/type/typeKeyword';
import { ArrayType } from '../code/node/type/arrayType';
import { UnionType } from '../code/node/type/unionType';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { ReturnStatement } from '../code/node/returnStatement';
import { MethodDeclaration } from '../code/node/methodDeclaration';
import { MethodModifiers } from '../code/node/modifier/methodModifiers';
import { Parameter } from '../code/node/parameter';
import { TypeLiteral } from '../code/node/type/typeLiteral';
import { TsExpression } from '../code/node/expressions';
import { tsg } from '../code/factory';
import { UserFields } from '../../../../test/out/__generated__/field';
import { EntityResult } from 'sasat';
import { User, UserIdentifiable } from '../../../../test/out/__generated__/entities/User';
import { resolveField } from '../../../../test/out/__generated__/relationMap';

export class GeneratedRepositoryGenerator {
  constructor(private node: RepositoryNode) {}

  generate(): TsFile {
    const node = this.node;
    const entityPath = Directory.entityPath(Directory.paths.generatedDataSource, node.entityName);
    return new TsFile(
      new Class(node.entityName.generatedDataSourceName())
        .export()
        .abstract()
        .extends(
          new ExtendsClause(
            tsg.typeRef(baseRepositoryName(), [
              tsg.typeRef(node.entityName.name).importFrom(entityPath),
              tsg.typeRef(node.entityName.creatableInterface()).importFrom(entityPath),
              tsg.typeRef(node.entityName.identifiableInterfaceName()).importFrom(entityPath),
            ]),
          ).addImport([baseRepositoryName()], 'sasat'),
        )
        .addProperty(...this.properties(node))
        .addMethod(this.getDefaultValueMethod(node), ...this.findMethods(node)),
    );
  }

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
        .propertyDeclaration('columns', tsg.arrayType(KeywordTypeNode.string), false)
        .modifiers(tsg.propertyModifiers().readonly().protected())
        .initializer(tsg.array(node.entity.fields.map(it => tsg.string(it.fieldName)))),
      tsg
        .propertyDeclaration('primaryKeys', new ArrayType(KeywordTypeNode.string), false)
        .modifiers(new PropertyModifiers().readonly().protected())
        .initializer(tsg.array(node.primaryKeys.map(it => tsg.string(it)))),
      tsg
        .propertyDeclaration(
          'autoIncrementColumn',
          new UnionType([KeywordTypeNode.string, KeywordTypeNode.undefined]),
          true,
        )
        .modifiers(new PropertyModifiers().readonly().protected())
        .initializer(node.autoIncrementColumn ? tsg.string(node.autoIncrementColumn) : tsg.identifier('undefined')),
    ];
  }

  private getDefaultValueMethod(node: RepositoryNode) {
    const properties = node.entity.hasDefaultValueFields().map(it => {
      const fieldToExpression = () => {
        if (it.onCreateCurrentTimestamp) {
          return tsg.identifier('getCurrentDateTimeString').addImport(['getCurrentDateTimeString'], 'sasat').call();
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
      columns.length !== 0 ? new TypeReference(node.entityName.name).pick(...columns) : new TypeLiteral(),
      [body],
    ).modifiers(new MethodModifiers().protected());
  }

  // findByUserId(userId: number, fields: UserFields): Promise<EntityResult<User, UserIdentifiable> | null> {
  //   const info = resolveField(fields, this.tableName);
  //   return this.first2({ where: { userId: userId } }, info);
  // }
  private findMethods(node: RepositoryNode) {
    return node.findMethods.map(it => {
      const body = [
        tsg.variable(
          'const',
          'info',
          tsg
            .identifier('resolveField')
            .importFrom(Directory.generatedPath(Directory.paths.generatedDataSource, 'relationMap'))
            .call(tsg.identifier('fields'), tsg.identifier('this.tableName')),
        ),
        new ReturnStatement(
          tsg
            .identifier(it.returnType.isArray ? 'this.find2' : 'this.first2')
            .call(
              tsg.object(
                new PropertyAssignment(
                  'where',
                  tsg.object(...it.params.map(it => new PropertyAssignment(it.name, tsg.identifier(it.name)))),
                ),
              ),
              tsg.identifier('info'),
            ),
        ),
      ];
      const returnType = tsg
        .typeRef('EntityResult', [
          tsg.typeRef(node.entityName.name),
          tsg.typeRef(node.entityName.identifiableInterfaceName()),
        ])
        .importFrom('sasat');
      return new MethodDeclaration(
        it.name,
        [
          ...it.params.map(it => new Parameter(it.name, it.type.toTsType())),
          new Parameter(
            `fields`,
            tsg
              .typeRef(`${node.entityName}Fields`)
              .importFrom(Directory.generatedPath(Directory.paths.generatedDataSource, 'fields')),
          ),
        ],
        new TypeReference('Promise', [
          it.returnType.isArray ? tsg.arrayType(returnType) : tsg.unionType([returnType, tsg.typeRef('null')]),
        ]),
        body,
      );
    });
  }
}
