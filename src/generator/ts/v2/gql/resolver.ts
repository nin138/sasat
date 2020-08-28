import { TsFileGenerator } from '../../tsFileGenerator';
import { TsCodeGenNestedObject } from '../../code/nestedObject';
import { IrGqlResolver } from '../../../../ir/gql/resolver';
import { TsFile } from '../file';
import { VariableDeclaration } from '../code/node/variableDeclaration';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { SpreadAssignment } from '../code/node/spreadAssignment';
import { ResolverNode } from '../../../../node/gql/resolverNode';
import { Parameter } from '../code/node/parameter';
import { Directory } from '../../../../constants/directory';
import {
  ArrowFunction,
  Identifier,
  NewExpression,
  ObjectLiteral,
  PropertyAccessExpression,
} from '../code/node/expressions';

export class ResolverGenerator {
  generate(nodes: ResolverNode[]): TsFile {
    return new TsFile(
      new VariableDeclaration(
        'const',
        new Identifier('resolvers'),
        new ObjectLiteral(
          new PropertyAssignment('Query', new Identifier('query').importFrom('./query')),
          new PropertyAssignment('Mutation', new Identifier('mutation').importFrom('./mutation')),
          new PropertyAssignment('Subscription', new Identifier('subscription').importFrom('./subscription')),
          new SpreadAssignment(
            new ObjectLiteral(
              ...nodes.map(
                node =>
                  new PropertyAssignment(
                    node.entity.name,
                    new ObjectLiteral(
                      ...node.relations.map(
                        relation =>
                          new PropertyAssignment(
                            relation.propertyName,
                            new ArrowFunction(
                              [
                                new Parameter(
                                  relation.parentEntity.name,
                                  relation.parentEntity.getTypeReference(Directory.paths.generated),
                                ),
                              ],
                              undefined,

                              new PropertyAccessExpression(
                                new NewExpression(
                                  new Identifier(relation.relativeEntity.dataSourceName()).importFrom(
                                    Directory.dataSourcePath(Directory.paths.generated, relation.relativeEntity),
                                  ),
                                ),
                                relation.functionName,
                              ).call(
                                ...relation.argumentColumns.map(it => new Identifier(`${relation.parentEntity}.${it}`)),
                              ),
                            ),
                          ),
                      ),
                    ),
                  ),
              ),
            ),
          ),
        ),
      ).export(),
    );
  }
}

export class TsGeneratorGqlResolver extends TsFileGenerator {
  private obj = new TsCodeGenNestedObject();
  private addResolver(resolver: IrGqlResolver) {
    this.obj.set(
      [resolver.parentEntity, resolver.gqlReferenceName],
      `(${resolver.parentEntity}: ${resolver.parentEntity}) => new ${resolver.currentEntity}Repository().${resolver.functionName}(${resolver.parentEntity}.${resolver.parentColumn})`,
    );
    this.addImport(`../repository/${resolver.parentEntity}`, `${resolver.parentEntity}Repository`);
    this.addImport(`./entity/${resolver.parentEntity}`, `${resolver.parentEntity}`);
  }
  constructor(irResolvers: IrGqlResolver[]) {
    super();
    this.addImport('./query', 'query');
    this.addImport('./mutation', 'mutation');
    this.addImport('./subscription', 'subscription');
    irResolvers.forEach(it => this.addResolver(it));

    const resolvers = [
      'Query: query',
      'Mutation: mutation',
      'Subscription: subscription',
      `...${this.obj.toTsString()}`,
    ];
    this.addLine(`\
export const resolvers = {
${resolvers.map(it => `  ${it},`).join('\n')}
};
`);
  }
}
