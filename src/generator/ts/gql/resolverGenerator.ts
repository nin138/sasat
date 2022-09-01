import { TsFile } from '../file.js';
import { VariableDeclaration } from '../code/node/variableDeclaration.js';
import { PropertyAssignment } from '../code/node/propertyAssignment.js';
import { SpreadAssignment } from '../code/node/spreadAssignment.js';
import { Identifier, ObjectLiteral } from '../code/node/expressions.js';
import { tsg } from '../code/factory.js';
import { Directory } from '../../../constants/directory.js';
import { RelationNode } from '../../../parser/node/relationNode.js';
import { EntityNode } from '../../../parser/node/entityNode.js';
import { RootNode } from '../../../parser/node/rootNode.js';
import { FindMethodNode } from '../../../parser/node/findMethod.js';

export class ResolverGenerator {
  private relationProperty(relation: RelationNode) {
    const paramName = relation.parent.entityName.lowerCase();
    const propertyName = relation.refPropertyName();
    return tsg.propertyAssign(
      propertyName,
      tsg.arrowFunc(
        [
          tsg.parameter(
            paramName,
            tsg
              .typeRef(relation.parent.entityName.resultType())
              .importFrom('./relationMap'),
          ),
        ],
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
                  .importFrom(
                    Directory.dbDataSourcePath(
                      Directory.paths.generated,
                      relation.toEntityName,
                    ),
                  ),
              )
              .property(FindMethodNode.paramsToName(relation.toField))
              .call(
                tsg
                  .identifier(paramName)
                  .property(relation.fromField)
                  .nonNull(),
              ),
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
        [
          tsg.parameter(
            paramName,
            tsg
              .typeRef(relation.toEntityName.resultType())
              .importFrom('./relationMap'),
          ),
        ],
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
                  .importFrom(
                    Directory.dbDataSourcePath(
                      Directory.paths.generated,
                      relation.parent.entityName,
                    ),
                  ),
              )
              .property(FindMethodNode.paramsToName(relation.fromField))
              .call(
                tsg.identifier(paramName).property(relation.toField).nonNull(),
              ),
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
        ...node
          .findReferencedRelations()
          .map(relation => this.referencedByProperty(relation)),
      ),
    );
  };

  generate(root: RootNode): TsFile {
    const hasSubscription = root.mutations().some(it => it.subscribed);
    const properties = [
      new PropertyAssignment(
        'Query',
        new Identifier('query').importFrom('./query'),
      ),
      new PropertyAssignment(
        'Mutation',
        new Identifier('mutation').importFrom('./mutation'),
      ),
    ];
    if (hasSubscription)
      properties.push(
        new PropertyAssignment(
          'Subscription',
          new Identifier('subscription').importFrom('./subscription'),
        ),
      );
    return new TsFile(
      new VariableDeclaration(
        'const',
        new Identifier('resolvers'),
        new ObjectLiteral(
          ...properties,
          new SpreadAssignment(
            new ObjectLiteral(...root.entities().map(this.entityResolver)),
          ),
        ),
      ).export(),
    );
  }
}
