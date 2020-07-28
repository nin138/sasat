import {
  baseRepositoryName,
  creatableInterfaceName,
  generatedDataSourceName,
  identifiableInterfaceName,
} from '../../../constants/interfaceConstants';
import { TsFile } from './file';
import { Class } from './code/node/class';
import { RepositoryNode } from '../../../generatable/repository';
import { ExtendsClause } from './code/node/extendsClause';
import { TypeReference } from './code/node/type/typeReference';
import {
  GeneratedRepositoryPath,
  getEntityPath,
} from '../../../constants/directory';
import { PropertyDeclaration } from './code/node/propertyDeclaration';
import { KeywordTypeNode } from './code/node/type/typeKeyword';
import { PropertyModifiers } from './code/node/modifier/propertyModifiers';
import { TsAccessor } from '../tsClassGenerator';
import { ArrayLiteral, StringLiteral } from './code/node/literal/literal';
import { ArrayType } from './code/node/type/arrayType';
import { UnionType } from './code/node/type/unionType';
import { Identifier } from './code/node/Identifier';

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
              new TypeReference(
                creatableInterfaceName(node.entityName),
              ).importFrom(entityPath),
              new TypeReference(
                identifiableInterfaceName(node.entityName),
              ).importFrom(entityPath),
            ]),
          ),
        )
        .addProperty(
          new PropertyDeclaration('tableName', KeywordTypeNode.string, false)
            .modifiers(new PropertyModifiers().readonly())
            .initializer(new StringLiteral(node.entityName)),
          new PropertyDeclaration(
            'primaryKeys',
            new ArrayType(KeywordTypeNode.string),
            false,
          )
            .modifiers(
              new PropertyModifiers().readonly().accessor(TsAccessor.protected),
            )
            .initializer(
              new ArrayLiteral(
                node.primaryKeys.map(it => new StringLiteral(it)),
              ),
            ),
          new PropertyDeclaration(
            'autoIncrementColumn',
            new UnionType([KeywordTypeNode.string, KeywordTypeNode.undefined]),
            true,
          )
            .modifiers(
              new PropertyModifiers().readonly().accessor(TsAccessor.protected),
            )
            .initializer(
              node.autoIncrementColumn
                ? new StringLiteral(node.autoIncrementColumn)
                : new Identifier('undefined'),
            ),
        ),
    );
  }
}
