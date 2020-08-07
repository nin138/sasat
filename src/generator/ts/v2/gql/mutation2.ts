import { TsFile } from '../file';
import { VariableDeclaration } from '../code/node/variableDeclaration';
import { ObjectLiteral } from '../code/node/literal/literal';
import { MutationNode } from '../../../../node/gql/mutationNode';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { EntityName } from '../../../../entity/entityName';

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
      const property = new PropertyAssignment(MutationGenerator.createFunctionName(node.entityName));
    }
  }
}
