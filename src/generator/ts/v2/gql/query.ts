import { TsFile } from '../file';
import { VariableDeclaration } from '../code/node/variableDeclaration';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { Parameter } from '../code/node/parameter';
import { TypeLiteral } from '../code/node/type/typeLiteral';
import { RepositoryNode } from '../../../../node/repository';
import { Directory } from '../../../../constants/directory';
import { plural } from '../../../../util/stringUtil';
import {
  ArrowFunction,
  Identifier,
  NewExpression,
  ObjectLiteral,
  PropertyAccessExpression,
} from '../code/node/expressions';

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
              node.entityName.getTypeReference(Directory.paths.generated).pick(...node.primaryKeys),
            ),
          ],
          undefined,
          new PropertyAccessExpression(
            new NewExpression(
              new Identifier(node.entityName.dataSourceName()).importFrom(
                Directory.dataSourcePath(Directory.paths.generated, node.entityName),
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
                Directory.dataSourcePath(Directory.paths.generated, node.entityName),
              ),
            ),
            'list',
          ).call(),
        ),
      ),
    ];
  }
}
