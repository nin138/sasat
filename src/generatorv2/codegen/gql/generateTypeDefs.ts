import { TsFile, PropertyAssignment, tsg } from '../../../tsg/index.js';
import { nonNullableFilter } from '../../../util/type.js';
import { EntityNode, FieldNode } from '../../nodes/entityNode.js';
import { RootNode } from '../../nodes/rootNode.js';
import { QueryNode } from '../../nodes/queryNode.js';
import { MutationNode } from '../../nodes/mutationNode.js';
import { SubscriptionNode } from '../../nodes/subscriptionNode.js';
import { GQLString, makeGQLType } from './gqlString.js';
import { typeFieldDefinitionToTsg } from './typeDefinition.js';
import { EntityName } from '../../nodes/entityName.js';

export const generateTypeDefs = (root: RootNode) => {
  const types = [
    ...root.entities.map(makeEntityType),
    makeQuery(root.queries),
    makeMutation(root.mutations),
    makeSubscription(root.subscriptions.filter(it => it.gqlEnabled)),
  ].filter(nonNullableFilter);

  const inputs = [
    tsg.propertyAssign(
      'PagingOption',
      tsg.object(
        tsg.propertyAssign(
          'numberOfItem',
          typeFieldDefinitionToTsg({ return: 'Int!' }),
        ),
        tsg.propertyAssign(
          'offset',
          typeFieldDefinitionToTsg({ return: 'Int' }),
        ),
        tsg.propertyAssign(
          'order',
          typeFieldDefinitionToTsg({ return: 'String' }),
        ),
        tsg.propertyAssign(
          'asc',
          typeFieldDefinitionToTsg({ return: 'Boolean' }),
        ),
      ),
    ),
    ...root.entities.map(makeCreateInput),
    ...root.entities.map(makeUpdateInput),
  ].filter(nonNullableFilter);

  return new TsFile(
    tsg
      .variable('const', tsg.identifier('typeDefs'), tsg.object(...types))
      .export(),
    tsg
      .variable('const', tsg.identifier('inputs'), tsg.object(...inputs))
      .export(),
  ).disableEsLint();
};

const makeEntityType = (node: EntityNode): PropertyAssignment | null => {
  if (!node.gqlEnabled) return null;
  return tsg.propertyAssign(
    node.name.name,
    tsg.object(
      ...node.fields
        .filter(it => it.isGQLOpen)
        .map(it => {
          return tsg.propertyAssign(
            it.fieldName,
            typeFieldDefinitionToTsg({
              return: makeGQLType(it.gqlType, it.isNullable, it.isArray),
            }),
          );
        }),
      ...node.references
        .filter(it => it.isGQLOpen)
        .map(it => {
          return tsg.propertyAssign(
            it.fieldName,
            typeFieldDefinitionToTsg({
              return: makeGQLType(
                EntityName.fromTableName(it.parentTableName).name,
                it.isNullable,
                it.isArray,
              ),
            }),
          );
        }),
      ...node.referencedBy
        .filter(it => it.isGQLOpen)
        .map(it => {
          return tsg.propertyAssign(
            it.fieldName,
            typeFieldDefinitionToTsg({
              return: makeGQLType(
                EntityName.fromTableName(it.childTable).name,
                it.isNullable,
                it.isArray,
              ),
            }),
          );
        }),
    ),
  );
};

const makeInput = (inputName: string, fields: FieldNode[]) => {
  return tsg.propertyAssign(
    inputName,
    tsg.object(
      ...fields
        .filter(it => it.isGQLOpen)
        .map(it =>
          tsg.propertyAssign(
            it.fieldName,
            typeFieldDefinitionToTsg({
              return: makeGQLType(it.gqlType, it.isNullable, it.isArray),
            }),
          ),
        ),
    ),
  );
};

const makeCreateInput = (node: EntityNode) => {
  if (!node.gqlEnabled || !node.creatable.gqlEnabled) return null;
  return makeInput(node.name.createInputName(), node.creatable.fields);
};

const makeUpdateInput = (node: EntityNode) => {
  if (!node.gqlEnabled || !node.updateInput.gqlEnabled) return null;
  return makeInput(node.name.updateInputName(), node.updateInput.fields);
};

const makeQuery = (queries: QueryNode[]) => {
  if (queries.length === 0) return null;
  return tsg.propertyAssign(
    'Query',
    tsg.object(
      ...queries.map(query => {
        return tsg.propertyAssign(
          query.queryName,
          typeFieldDefinitionToTsg({
            return: GQLString.type(query.returnType),
            args: query.args.map(arg => ({
              name: arg.name,
              type: GQLString.type(arg.type),
            })),
          }),
        );
      }),
    ),
  );
};

const makeMutation = (mutations: MutationNode[]) => {
  if (mutations.length === 0) return null;
  return tsg.propertyAssign(
    'Mutation',
    tsg.object(
      ...mutations.map(mutation => {
        return tsg.propertyAssign(
          mutation.mutationName,
          typeFieldDefinitionToTsg({
            return: GQLString.type(mutation.returnType),
            args: mutation.args.map(arg => ({
              name: arg.name,
              type: GQLString.type(arg.type),
            })),
          }),
        );
      }),
    ),
  );
};

const makeSubscription = (subscriptions: SubscriptionNode[]) => {
  if (subscriptions.length === 0) return null;
  return tsg.propertyAssign(
    'Subscription',
    tsg.object(
      ...subscriptions.map(subscription => {
        return tsg.propertyAssign(
          subscription.subscriptionName,
          typeFieldDefinitionToTsg({
            return: GQLString.type(subscription.returnType),
            args: subscription.args.map(arg => ({
              name: arg.name,
              type: GQLString.type(arg.type),
            })),
          }),
        );
      }),
    ),
  );
};
