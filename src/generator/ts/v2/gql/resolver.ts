import { TsFile } from '../file';
import { VariableDeclaration } from '../code/node/variableDeclaration';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { SpreadAssignment } from '../code/node/spreadAssignment';
import { ResolverNode } from '../../../../node/gql/resolverNode';
import { Directory } from '../../../../constants/directory';
import { Identifier, ObjectLiteral } from '../code/node/expressions';
import { tsg } from '../code/factory';

export class ResolverGenerator {
  private createResolver(node: ResolverNode): PropertyAssignment {
    return tsg.propertyAssign(
      node.entity.name,
      tsg.object(
        ...node.relations.map(relation =>
          tsg.propertyAssign(
            relation.propertyName,
            tsg.arrowFunc(
              [
                tsg.parameter(
                  relation.parentEntity.name,
                  relation.parentEntity.getTypeReference(Directory.paths.generated),
                ),
              ],
              undefined,
              tsg
                .new(
                  tsg
                    .identifier(relation.relativeEntity.dataSourceName())
                    .importFrom(Directory.dataSourcePath(Directory.paths.generated, relation.relativeEntity)),
                )
                .property(relation.functionName)
                .call(...relation.argumentColumns.map(it => tsg.identifier(`${relation.parentEntity}.${it}`))),
            ),
          ),
        ),
      ),
    );
  }

  generate(nodes: ResolverNode[]): TsFile {
    return new TsFile(
      new VariableDeclaration(
        'const',
        new Identifier('resolvers'),
        new ObjectLiteral(
          new PropertyAssignment('Query', new Identifier('query').importFrom('./query')),
          new PropertyAssignment('Mutation', new Identifier('mutation').importFrom('./mutation')),
          new PropertyAssignment('Subscription', new Identifier('subscription').importFrom('./subscription')),
          new SpreadAssignment(new ObjectLiteral(...nodes.map(this.createResolver))),
        ),
      ).export(),
    );
  }
}
