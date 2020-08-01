import {
  baseRepositoryName,
  creatableInterfaceName,
  generatedDataSourceName,
  identifiableInterfaceName,
} from '../../../constants/interfaceConstants';
import { TsFile } from './file';
import { Class } from './code/node/class';
import { RepositoryNode } from '../../../node/repository';
import { ExtendsClause } from './code/node/extendsClause';
import { TypeReference } from './code/node/type/typeReference';
import { GeneratedRepositoryPath, getEntityPath } from '../../../constants/directory';
import { PropertyDeclaration } from './code/node/propertyDeclaration';
import { KeywordTypeNode } from './code/node/type/typeKeyword';
import { PropertyModifiers } from './code/node/modifier/propertyModifiers';
import { ArrayLiteral, NumericLiteral, ObjectLiteral, StringLiteral } from './code/node/literal/literal';
import { ArrayType } from './code/node/type/arrayType';
import { UnionType } from './code/node/type/unionType';
import { Identifier } from './code/node/Identifier';
import { MethodDeclaration } from './code/node/methodDeclaration';
import { MethodModifiers } from './code/node/modifier/methodModifiers';
import { ReturnStatement } from './code/node/returnStatement';
import { PropertyAssignment } from './code/node/propertyAssignment';
import { CallExpression } from './code/node/CallExpression';
import { SqlValueType } from '../../../db/dbClient';
import { TsExpression } from './code/abstruct/expression';
import { Parameter } from './code/node/parameter';
import { TypeLiteral } from './code/node/type/typeLiteral';

export class GeneratedRepositoryGenerator {
  constructor(private node: RepositoryNode) {}

  generate() {
    const node = this.node;
    const entityPath = getEntityPath(GeneratedRepositoryPath, node.entityName);
    return new TsFile(
      new Class(generatedDataSourceName(node.entityName))
        .export()
        .abstract()
        .extends(
          new ExtendsClause(
            new TypeReference(baseRepositoryName(), [
              new TypeReference(node.entityName).importFrom(entityPath),
              new TypeReference(creatableInterfaceName(node.entityName)).importFrom(entityPath),
              new TypeReference(identifiableInterfaceName(node.entityName)).importFrom(entityPath),
            ]),
          ).addImport([baseRepositoryName()], 'sasat'),
        )
        .addProperty(...this.properties(node))
        .addMethod(this.getDefaultValueMethod(node), ...this.findMethods(node)),
    );
  }
  private sqlValueToTsExpression(value: SqlValueType): TsExpression {
    if (typeof value === 'string') {
      return new StringLiteral(value);
    }
    if (typeof value === 'number') {
      return new NumericLiteral(value);
    }
    return new Identifier('null');
  }

  private properties(node: RepositoryNode) {
    return [
      new PropertyDeclaration('tableName', KeywordTypeNode.string, false)
        .modifiers(new PropertyModifiers().readonly())
        .initializer(new StringLiteral(node.entityName)),
      new PropertyDeclaration('primaryKeys', new ArrayType(KeywordTypeNode.string), false)
        .modifiers(new PropertyModifiers().readonly().protected())
        .initializer(new ArrayLiteral(node.primaryKeys.map(it => new StringLiteral(it)))),
      new PropertyDeclaration(
        'autoIncrementColumn',
        new UnionType([KeywordTypeNode.string, KeywordTypeNode.undefined]),
        true,
      )
        .modifiers(new PropertyModifiers().readonly().protected())
        .initializer(
          node.autoIncrementColumn ? new StringLiteral(node.autoIncrementColumn) : new Identifier('undefined'),
        ),
    ];
  }

  private getDefaultValueMethod(node: RepositoryNode) {
    const properties = node.entity.hasDefaultValueFields().map(it => {
      const fieldToExpression = () => {
        if (it.onCreateCurrentTimestamp) {
          return new CallExpression(
            new Identifier('getCurrentDateTimeString').addImport(['getCurrentDateTimeString'], 'sasat'),
          );
        }
        return this.sqlValueToTsExpression(it.defaultValue!);
      };
      return new PropertyAssignment(it.fieldName, fieldToExpression());
    });
    const body = new ReturnStatement(new ObjectLiteral(...properties));

    const columns = node.getDefaultValueColumnNames();
    return new MethodDeclaration(
      'getDefaultValueString',
      [],
      columns.length !== 0 ? new TypeReference(node.entityName).pick(...columns) : new TypeLiteral(),
      [body],
    ).modifiers(new MethodModifiers().protected());
  }

  private findMethods(node: RepositoryNode) {
    return node.findMethods.map(it => {
      const body = new ReturnStatement(
        new CallExpression(
          new Identifier(it.returnType.isArray ? 'this.find' : 'this.first'),
          new ObjectLiteral(
            new PropertyAssignment(
              'where',
              new ObjectLiteral(...it.params.map(it => new PropertyAssignment(it.name, new Identifier(it.name)))),
            ),
          ),
        ),
      );
      return new MethodDeclaration(
        it.name,
        it.params.map(it => new Parameter(it.name, it.type.toTsType())),
        new TypeReference('Promise', [it.returnType.toTsType()]),
        [body],
      );
    });
  }
}
