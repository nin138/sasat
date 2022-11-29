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
            tsg.binary(
              tsg.identifier(paramName).property(propertyName),
              '!==',
              tsg.identifier('undefined'),
            ),
            tsg.return(tsg.identifier(paramName).property(propertyName)),
          ),
          tsg.return(
            tsg
              .new(
                tsg
                  .identifier(relation.to.entityName.dataSourceName())
                  .importFrom(
                    Directory.dbDataSourcePath(
                      Directory.paths.generated,
                      relation.to.entityName,
                    ),
                  ),
              )
              .property(FindMethodNode.paramsToName(relation.to.field))
              .call(
                tsg
                  .identifier(paramName)
                  .property(relation.from.field)
                  .nonNull(),
              ),
          ),
        ),
      ),
    );
  }

  private referencedByProperty(relation: RelationNode) {
    const paramName = relation.to.entityName.lowerCase();
    const propertyName = relation.referencedByPropertyName();
    return tsg.propertyAssign(
      propertyName,
      tsg.arrowFunc(
        [
          tsg.parameter(
            paramName,
            tsg
              .typeRef(relation.to.entityName.resultType())
              .importFrom('./relationMap'),
          ),
        ],
        undefined,
        tsg.block(
          tsg.if(
            tsg.binary(
              tsg.identifier(paramName).property(propertyName),
              '!==',
              tsg.identifier('undefined'),
            ),
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
              .property(FindMethodNode.paramsToName(relation.from.field))
              .call(
                tsg.identifier(paramName).property(relation.to.field).nonNull(),
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
        ...node.relations.filter(it => it.to.gqlOption.enabled).map(relation => this.relationProperty(relation)),
        ...node
          .findReferencedRelations()
          .filter(it => it.from.gqlOption.enabled)
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
            new ObjectLiteral(...root.entities().filter(it => it.gqlEnabled()).map(this.entityResolver)),
          ),
        ),
      ).export(),
    ).disableEsLint();
  }
}
