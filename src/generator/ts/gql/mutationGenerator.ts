import { TsFile } from '../file.js';
import { VariableDeclaration } from '../code/node/variableDeclaration.js';
import { PropertyAssignment } from '../code/node/propertyAssignment.js';
import { TypeReference } from '../code/node/type/typeReference.js';
import { Parameter } from '../code/node/parameter.js';
import { Block } from '../code/node/block.js';
import { ReturnStatement } from '../code/node/returnStatement.js';
import { SpreadAssignment } from '../code/node/spreadAssignment.js';
import { ExpressionStatement } from '../code/node/expressionStatement.js';
import { TsType } from '../code/node/type/type.js';
import { KeywordTypeNode } from '../code/node/type/typeKeyword.js';
import {
  ArrowFunction,
  AsyncExpression,
  AwaitExpression,
  CallExpression,
  Identifier,
  NewExpression,
  NumericLiteral,
  ObjectLiteral,
  PropertyAccessExpression,
} from '../code/node/expressions.js';
import { Directory } from '../../../constants/directory.js';
import { SasatError } from '../../../error.js';
import { tsg } from '../code/factory.js';
import {
  CreateMutationNode,
  DeleteMutationNode,
  MutationNode,
  UpdateMutationNode,
} from '../../../parser/node/gql/mutationNode.js';
import { ContextParamNode } from '../../../parser/node/gql/contextParamNode.js';
import { EntityName } from '../../../parser/node/entityName.js';
import { TsStatement } from '../code/abstruct/statement';

export class MutationGenerator {
  generate = (mutations: MutationNode[]): TsFile => {
    return new TsFile(
      new VariableDeclaration(
        'const',
        new Identifier('mutation'),
        new ObjectLiteral(...mutations.flatMap(this.mutationToProperty)),
      ).export(),
    );
  };

  private static functionParams(
    paramType: TsType,
    useContext: boolean,
    reFetch: boolean,
  ) {
    return [
      tsg.parameter('_', tsg.typeRef('unknown')),
      tsg.parameter('params', paramType),
      tsg.parameter(
        useContext ? 'context' : '_1',
        tsg.typeRef('GqlContext').importFrom('../context'),
      ),
      tsg.parameter(
        reFetch ? 'info' : '_2',
        tsg.typeRef('GraphQLResolveInfo').importFrom('graphql'),
      ),
    ];
  }

  private createMutation(node: CreateMutationNode): PropertyAssignment {
    return tsg.propertyAssign(
      node.functionName(),
      new ArrowFunction(
        MutationGenerator.functionParams(
          node.entityName.getTypeReference(Directory.paths.generated),
          node.useContextParams(),
          node.reFetch,
        ),
        tsg.typeRef('Promise', [
          node.entityName.toIdentifier(Directory.paths.generated),
        ]),
        MutationGenerator.createFunctionBody(node),
      ).toAsync(),
    );
  }

  private updateMutation(node: UpdateMutationNode): PropertyAssignment {
    const returnType = node.reFetch
      ? node.entityName.entityResultType(Directory.paths.generated)
      : KeywordTypeNode.boolean;

    return tsg.propertyAssign(
      node.functionName(),
      tsg.async(
        tsg.arrowFunc(
          MutationGenerator.functionParams(
            tsg.intersectionType(
              node.entityName.identifiableTypeReference(
                Directory.paths.generated,
              ),
              tsg.typeRef(node.entityName.name).partial(),
            ),
            node.useContextParams(),
            node.reFetch,
          ),
          tsg.typeRef('Promise', [returnType]),
          MutationGenerator.updateFunctionBody(node),
        ),
      ),
    );
  }

  private deleteMutation(node: DeleteMutationNode): PropertyAssignment {
    return new PropertyAssignment(
      node.functionName(),
      new AsyncExpression(
        new ArrowFunction(
          [
            new Parameter('_', tsg.typeRef('unknown')),
            new Parameter(
              'params',
              node.entityName.identifiableTypeReference(
                Directory.paths.generated,
              ),
            ),
          ],
          new TypeReference('Promise', [KeywordTypeNode.boolean]),
          MutationGenerator.deleteFunctionBody(node),
        ),
      ),
    );
  }

  private mutationToProperty = (node: MutationNode): PropertyAssignment => {
    if (MutationNode.isCreateMutation(node)) return this.createMutation(node);
    if (MutationNode.isUpdateMutation(node)) return this.updateMutation(node);
    if (MutationNode.isDeleteMutation(node)) return this.deleteMutation(node);
    throw new SasatError(`Unexpected Mutation Type :: ${node.type}`);
  };

  private static toDatasourceParam(contextParams: ContextParamNode[]) {
    const paramsIdentifier = new Identifier('params');
    if (contextParams.length === 0) return paramsIdentifier;
    return new ObjectLiteral(
      new SpreadAssignment(paramsIdentifier),
      ...contextParams.map(
        it =>
          new PropertyAssignment(
            it.paramName,
            new Identifier(`context.${it.contextName}`),
          ),
      ),
    );
  }

  private static getDatasourceIdentifier(entityName: EntityName) {
    return new Identifier(entityName.dataSourceName()).importFrom(
      Directory.dbDataSourcePath(Directory.paths.generated, entityName),
    );
  }

  private static createFunctionBody(node: MutationNode) {
    const createCallExpression = new CallExpression(
      new PropertyAccessExpression(
        new NewExpression(this.getDatasourceIdentifier(node.entityName)),
        'create',
      ),
      this.toDatasourceParam(node.contextParams),
    );
    if (!node.subscribed) return createCallExpression;
    const resultIdentifier = new Identifier('result');
    return new Block(
      new VariableDeclaration(
        'const',
        resultIdentifier,
        new AwaitExpression(createCallExpression),
      ),
      new ExpressionStatement(
        new AwaitExpression(
          new CallExpression(
            new Identifier(node.publishFunctionName()).importFrom(
              './subscription',
            ),
            resultIdentifier,
          ),
        ),
      ),
      new ReturnStatement(resultIdentifier),
    );
  }

  private static updateFunctionBody(node: MutationNode) {
    const resultIdentifier = tsg.identifier('result');

    const statements: TsStatement[] = [
      tsg.variable(
        'const',
        resultIdentifier,
        tsg.await(
          tsg
            .new(this.getDatasourceIdentifier(node.entityName))
            .property('update')
            .call(this.toDatasourceParam(node.contextParams))
            .property('then')
            .call(
              tsg.arrowFunc(
                [
                  tsg.parameter(
                    'it',
                    tsg.typeRef('CommandResponse').importFrom('sasat'),
                  ),
                ],
                KeywordTypeNode.boolean,
                tsg.binary(
                  tsg.identifier('it.changedRows'),
                  '===',
                  tsg.number(1),
                ),
              ),
            ),
        ),
      ),
    ];
    if (node.subscribed) {
      const publishCall = tsg
        .identifier(node.publishFunctionName())
        .importFrom('./subscription')
        .call(
          tsg
            .parenthesis(
              tsg.await(
                tsg
                  .new(tsg.identifier(node.entityName.dataSourceName()))
                  .property(node.primaryFindQueryName)
                  .call(
                    ...node.primaryKeys.map(it =>
                      tsg.identifier(`params.${it}`),
                    ),
                  ),
              ),
            )
            .nonNull()
            .as(tsg.typeRef(node.entityName.name)),
        );

      statements.push(
        tsg.if(
          resultIdentifier,
          tsg.block(tsg.await(publishCall).toStatement()),
        ),
      );
    }

    if (node.reFetch) {
      statements.push(
        tsg.return(
          tsg
            .identifier('query')
            .importFrom('./query')
            .property(node.entityName.lowerCase())
            .call(
              tsg.identifier('_'),
              tsg.identifier('params'),
              tsg.identifier('context'),
              tsg.identifier('info'),
            )
            .as(tsg.typeRef('Promise', [tsg.typeRef(node.entityName.name)])),
        ),
      );
    } else {
      statements.push(tsg.return(resultIdentifier));
    }

    return tsg.block(...statements);
  }

  private static deleteFunctionBody(node: MutationNode) {
    const deleteCall = tsg
      .new(MutationGenerator.getDatasourceIdentifier(node.entityName))
      .property('delete')
      .call(tsg.identifier('params'))
      .property('then')
      .call(
        tsg.arrowFunc(
          [
            tsg.parameter(
              'it',
              tsg.typeRef('CommandResponse').importFrom('sasat'),
            ),
          ],
          KeywordTypeNode.boolean,
          tsg.binary(
            tsg.identifier('it.affectedRows'),
            '===',
            new NumericLiteral(1),
          ),
        ),
      );

    if (!node.subscribed) return deleteCall;
    const result = new Identifier('result');

    return tsg.block(
      tsg.variable('const', result, tsg.await(deleteCall)),
      tsg.if(
        result,
        tsg.block(
          tsg
            .await(
              tsg
                .identifier(node.publishFunctionName())
                .importFrom('./subscription')
                .call(tsg.identifier('params')),
            )
            .toStatement(),
        ),
      ),
      tsg.return(result),
    );
  }
}
