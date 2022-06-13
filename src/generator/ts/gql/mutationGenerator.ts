import { TsFile } from '../file.js';
import { VariableDeclaration } from '../code/node/variableDeclaration.js';
import { PropertyAssignment } from '../code/node/propertyAssignment.js';
import { TypeReference } from '../code/node/type/typeReference.js';
import { Parameter } from '../code/node/parameter.js';
import { Block } from '../code/node/block.js';
import { ReturnStatement } from '../code/node/returnStatement.js';
import { SpreadAssignment } from '../code/node/spreadAssignment.js';
import { ExpressionStatement } from '../code/node/expressionStatement.js';
import { IntersectionType } from '../code/node/type/intersectionType.js';
import { TsType } from '../code/node/type/type.js';
import { KeywordTypeNode } from '../code/node/type/typeKeyword.js';
import { IfStatement } from '../code/node/ifStatement.js';
import {
  ArrowFunction,
  AsyncExpression,
  AwaitExpression,
  BinaryExpression,
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

  private static functionParams(paramType: TsType, useContext: boolean) {
    const params = [new Parameter('_', tsg.typeRef('unknown')), new Parameter('params', paramType)];
    if (!useContext) return params;
    return [...params, new Parameter('context', new TypeReference('GqlContext').importFrom('../context'))];
  }

  private createMutation(node: CreateMutationNode): PropertyAssignment {
    return tsg.propertyAssign(
      node.functionName(),
      new ArrowFunction(
        MutationGenerator.functionParams(
          node.entityName.getTypeReference(Directory.paths.generated),
          node.useContextParams(),
        ),
        tsg.typeRef('Promise', [node.entityName.toIdentifier(Directory.paths.generated)]),
        MutationGenerator.createFunctionBody(node),
      ).toAsync(),
    );
  }

  private updateMutation(node: UpdateMutationNode): PropertyAssignment {
    return new PropertyAssignment(
      node.functionName(),
      new AsyncExpression(
        new ArrowFunction(
          MutationGenerator.functionParams(
            new IntersectionType(
              node.entityName.identifiableTypeReference(Directory.paths.generated),
              new TypeReference(node.entityName.name).partial(),
            ),
            node.useContextParams(),
          ),
          new TypeReference('Promise', [KeywordTypeNode.boolean]),
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
            new Parameter('params', node.entityName.identifiableTypeReference(Directory.paths.generated)),
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
      ...contextParams.map(it => new PropertyAssignment(it.paramName, new Identifier(`context.${it.contextName}`))),
    );
  }

  private static getDatasourceIdentifier(entityName: EntityName) {
    return new Identifier(entityName.dataSourceName()).importFrom(
      Directory.dbDataSourcePath(Directory.paths.generated, entityName),
    );
  }

  private static createFunctionBody(node: MutationNode) {
    const createCallExpression = new CallExpression(
      new PropertyAccessExpression(new NewExpression(this.getDatasourceIdentifier(node.entityName)), 'create'),
      this.toDatasourceParam(node.contextParams),
    );
    if (!node.subscribed) return createCallExpression;
    const resultIdentifier = new Identifier('result');
    return new Block(
      new VariableDeclaration('const', resultIdentifier, new AwaitExpression(createCallExpression)),
      new ExpressionStatement(
        new AwaitExpression(
          new CallExpression(new Identifier(node.publishFunctionName()).importFrom('./subscription'), resultIdentifier),
        ),
      ),
      new ReturnStatement(resultIdentifier),
    );
  }

  private static updateFunctionBody(node: MutationNode) {
    const updateCall = new CallExpression(
      new PropertyAccessExpression(
        new CallExpression(
          new PropertyAccessExpression(new NewExpression(this.getDatasourceIdentifier(node.entityName)), 'update'),
          this.toDatasourceParam(node.contextParams),
        ),
        'then',
      ),
      new ArrowFunction(
        [new Parameter('it', new TypeReference('CommandResponse').importFrom('sasat'))],
        KeywordTypeNode.boolean,
        new BinaryExpression(new Identifier('it.changedRows'), '===', new NumericLiteral(1)),
      ),
    );
    if (!node.subscribed) return updateCall;
    const resultIdentifier = new Identifier('result');
    return new Block(
      new VariableDeclaration('const', resultIdentifier, updateCall),
      new IfStatement(
        resultIdentifier,
        new Block(
          new AwaitExpression(
            new CallExpression(
              tsg.identifier(node.publishFunctionName()).importFrom('./subscription'),
              tsg
                .parenthesis(
                  tsg.await(
                    tsg
                      .new(tsg.identifier(node.entityName.dataSourceName()))
                      .property(node.primaryFindQueryName)
                      .call(...node.primaryKeys.map(it => tsg.identifier(`params.${it}`))),
                  ),
                )
                .nonNull()
                .as(tsg.typeRef(node.entityName.name)),
            ),
          ).toStatement(),
        ),
      ),
      new ReturnStatement(resultIdentifier),
    );
  }

  private static deleteFunctionBody(node: MutationNode) {
    const deleteCall = new CallExpression(
      new PropertyAccessExpression(
        new CallExpression(
          new PropertyAccessExpression(
            new NewExpression(MutationGenerator.getDatasourceIdentifier(node.entityName)),
            'delete',
          ),
          new Identifier('params'),
        ),
        'then',
      ),
      new ArrowFunction(
        [new Parameter('it', new TypeReference('CommandResponse').importFrom('sasat'))],
        KeywordTypeNode.boolean,
        new BinaryExpression(new Identifier('it.affectedRows'), '===', new NumericLiteral(1)),
      ),
    );

    if (!node.subscribed) return deleteCall;
    const result = new Identifier('result');

    return new Block(
      new VariableDeclaration('const', result, deleteCall),
      new IfStatement(
        result,
        new Block(
          new AwaitExpression(
            new CallExpression(
              new Identifier(node.publishFunctionName()).importFrom('./subscription'),
              new Identifier('params'),
            ),
          ).toStatement(),
        ),
      ),
      new ReturnStatement(result),
    );
  }
}
