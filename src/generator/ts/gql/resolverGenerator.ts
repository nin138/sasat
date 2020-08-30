import { TsFile } from '../file';
import { VariableDeclaration } from '../code/node/variableDeclaration';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { SpreadAssignment } from '../code/node/spreadAssignment';
import { Identifier, ObjectLiteral } from '../code/node/expressions';
import { tsg } from '../code/factory';
import { Directory } from '../../../constants/directory';
import { EntityNode } from '../../../node/entityNode';
import { RelationNode } from '../../../node/relationNode';
import { Parser } from '../../../parser/parser';

export class ResolverGenerator {
  private relationProperty(relation: RelationNode) {
    const paramName = relation.parent.entityName.lowerCase();
    return tsg.propertyAssign(
      relation.refPropertyName(),
      tsg.arrowFunc(
        [tsg.parameter(paramName, relation.parent.entityName.getTypeReference(Directory.paths.generated))],
        undefined,
        tsg
          .new(
            tsg
              .identifier(relation.toEntityName.dataSourceName())
              .importFrom(Directory.dataSourcePath(Directory.paths.generated, relation.toEntityName)),
          )
          .property(Parser.paramsToQueryName(relation.toColumn))
          .call(tsg.identifier(paramName).property(relation.fromColumn)),
      ),
    );
  }

  private referencedByProperty(relation: RelationNode) {
    const paramName = relation.toEntityName.lowerCase();
    return tsg.propertyAssign(
      relation.referencedByPropertyName(),
      tsg.arrowFunc(
        [tsg.parameter(paramName, relation.toEntityName.getTypeReference(Directory.paths.generated))],
        undefined,
        tsg
          .new(
            tsg
              .identifier(relation.parent.entityName.dataSourceName())
              .importFrom(Directory.dataSourcePath(Directory.paths.generated, relation.parent.entityName)),
          )
          .property(Parser.paramsToQueryName(relation.fromColumn))
          .call(tsg.identifier(paramName).property(relation.toColumn)),
      ),
    );
  }

  private entityResolver = (node: EntityNode): PropertyAssignment => {
    return tsg.propertyAssign(
      node.entityName.name,
      tsg.object(
        ...node.relations.map(relation => this.relationProperty(relation)),
        ...node.findReferencedRelations().map(relation => this.referencedByProperty(relation)),
      ),
    );
  };

  generate(nodes: EntityNode[]): TsFile {
    return new TsFile(
      new VariableDeclaration(
        'const',
        new Identifier('resolvers'),
        new ObjectLiteral(
          new PropertyAssignment('Query', new Identifier('query').importFrom('./query')),
          new PropertyAssignment('Mutation', new Identifier('mutation').importFrom('./mutation')),
          new PropertyAssignment('Subscription', new Identifier('subscription').importFrom('./subscription')),
          new SpreadAssignment(new ObjectLiteral(...nodes.map(this.entityResolver))),
        ),
      ).export(),
    );
  }
}
