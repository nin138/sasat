import { TsFile } from '../file';
import { VariableDeclaration } from '../code/node/variableDeclaration';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { SpreadAssignment } from '../code/node/spreadAssignment';
import { Identifier, ObjectLiteral } from '../code/node/expressions';
import { tsg } from '../code/factory';
import { Directory } from '../../../constants/directory';
import { Parser } from '../../../parser/parser';
import { RelationNode } from '../../../parser/node/relationNode';
import { EntityNode } from '../../../parser/node/entityNode';
import { RootNode } from '../../../parser/node/rootNode';
import has = Reflect.has;
import { FindMethodNode } from '../../../parser/node/findMethod';

export class ResolverGenerator {
  private relationProperty(relation: RelationNode) {
    const paramName = relation.parent.entityName.lowerCase();
    const propertyName = relation.refPropertyName();
    return tsg.propertyAssign(
      propertyName,
      tsg.arrowFunc(
        [tsg.parameter(paramName, tsg.typeRef(relation.parent.entityName.resultType()).importFrom('./relationMap'))],
        undefined,
        tsg.block(
          tsg.if(
            tsg.identifier(paramName).property(propertyName),
            tsg.return(tsg.identifier(paramName).property(propertyName)),
          ),
          tsg.return(
            tsg
              .new(
                tsg
                  .identifier(relation.toEntityName.dataSourceName())
                  .importFrom(Directory.dataSourcePath(Directory.paths.generated, relation.toEntityName)),
              )
              .property(FindMethodNode.paramsToName(relation.toColumn))
              .call(tsg.identifier(paramName).property(relation.fromColumn).nonNull()),
          ),
        ),
      ),
    );
  }

  private referencedByProperty(relation: RelationNode) {
    const paramName = relation.toEntityName.lowerCase();
    const propertyName = relation.referencedByPropertyName();
    return tsg.propertyAssign(
      propertyName,
      tsg.arrowFunc(
        [tsg.parameter(paramName, tsg.typeRef(relation.toEntityName.resultType()).importFrom('./relationMap'))],
        undefined,
        tsg.block(
          tsg.if(
            tsg.identifier(paramName).property(propertyName),
            tsg.return(tsg.identifier(paramName).property(propertyName)),
          ),
          tsg.return(
            tsg
              .new(
                tsg
                  .identifier(relation.parent.entityName.dataSourceName())
                  .importFrom(Directory.dataSourcePath(Directory.paths.generated, relation.parent.entityName)),
              )
              .property(FindMethodNode.paramsToName(relation.fromColumn))
              .call(tsg.identifier(paramName).property(relation.toColumn).nonNull()),
          ),
        ),
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

  generate(root: RootNode): TsFile {
    const hasSubscription = root.mutations().some(it => it.subscribed);
    const properties = [
      new PropertyAssignment('Query', new Identifier('query').importFrom('./query')),
      new PropertyAssignment('Mutation', new Identifier('mutation').importFrom('./mutation')),
    ];
    if (hasSubscription)
      properties.push(
        new PropertyAssignment('Subscription', new Identifier('subscription').importFrom('./subscription')),
      );
    return new TsFile(
      new VariableDeclaration(
        'const',
        new Identifier('resolvers'),
        new ObjectLiteral(
          ...properties,
          new SpreadAssignment(new ObjectLiteral(...root.entities().map(this.entityResolver))),
        ),
      ).export(),
    );
  }
}
