import { RepositoryNode } from '../../../../node/repository';
import { TsFile } from '../file';
import { Directory } from '../../../../constants/directory';
import { Class } from '../code/node/class';
import { ExtendsClause } from '../code/node/extendsClause';
import { TypeReference } from '../code/node/type/typeReference';
import { baseRepositoryName } from '../../../../constants/interfaceConstants';
import { SqlValueType } from '../../../../db/dbClient';
import { PropertyDeclaration } from '../code/node/propertyDeclaration';
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
import {
  ArrayLiteral,
  CallExpression,
  Identifier,
  NumericLiteral,
  ObjectLiteral,
  StringLiteral,
  TsExpression,
} from '../code/node/expressions';

export class GeneratedRepositoryGenerator {
  constructor(private node: RepositoryNode) {}

  generate() {
    const node = this.node;
    const entityPath = Directory.entityPath(Directory.paths.generatedDataSource, node.entityName);
    return new TsFile(
      new Class(node.entityName.generatedDataSourceName())
        .export()
        .abstract()
        .extends(
          new ExtendsClause(
            new TypeReference(baseRepositoryName(), [
              new TypeReference(node.entityName.name).importFrom(entityPath),
              new TypeReference(node.entityName.creatableInterface()).importFrom(entityPath),
              new TypeReference(node.entityName.identifiableInterfaceName()).importFrom(entityPath),
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
        .initializer(new StringLiteral(node.tableName)),
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
      columns.length !== 0 ? new TypeReference(node.entityName.name).pick(...columns) : new TypeLiteral(),
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
