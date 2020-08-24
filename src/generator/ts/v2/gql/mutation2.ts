import { TsFile } from '../file';
import { VariableDeclaration } from '../code/node/variableDeclaration';
import { ObjectLiteral } from '../code/node/literal/literal';
import { MutationNode } from '../../../../node/gql/mutationNode';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { EntityName } from '../../../../entity/entityName';
import { ArrowFunction } from '../code/node/ArrowFunction';
import { TypeReference } from '../code/node/type/typeReference';
import { Identifier } from '../code/node/Identifier';
import { Parameter } from '../code/node/parameter';
import { TypeLiteral } from '../code/node/type/typeLiteral';
import { GeneratedPath, getEntityPath } from '../../../../constants/directory';
import { Block } from '../code/node/Block';
import { TsStatement } from '../code/abstruct/statement';
import { ReturnStatement } from '../code/node/returnStatement';

type a = {
  entityName: string;
  create: {
    enabled: boolean;
  };
};

export class MutationGenerator {
  generate(mutations: MutationNode[]): TsFile {
    return new TsFile(
      new VariableDeclaration(
        'const',
        'mutation',
        new ObjectLiteral(...mutations.flatMap(MutationGenerator.mutationToProperty)),
      ).export(),
    );
  }

  static createFunctionName(entityName: EntityName) {
    return `create${entityName}`;
  }
  static updateFunctionName(entityName: EntityName) {
    return `update${entityName}`;
  }
  private static mutationToProperty(node: MutationNode): PropertyAssignment[] {
    const result = [];
    if (node.onCreate.enabled) {
      const property = new PropertyAssignment(
        MutationGenerator.createFunctionName(node.entityName),
        new ArrowFunction(
          [
            new Parameter('_', new TypeLiteral()),
            new Parameter(
              'params',
              new TypeReference(node.entityName.creatableInterface()).importFrom(
                getEntityPath(GeneratedPath, node.entityName),
              ),
            ),
            new Parameter('context', new TypeReference('GqlContext').importFrom('../context')),
          ],
          new TypeReference('Promise', [node.entityName.toIdentifier()]),
          new Block(new ReturnStatement()),
        ),
      );
      result.push(property);
    }
  }
}
