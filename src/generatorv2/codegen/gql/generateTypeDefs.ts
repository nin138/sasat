import { TsFile, PropertyAssignment, tsg } from '../../../tsg/index.js';
import { nonNullableFilter } from '../../../util/type.js';
import { EntityNode } from '../../nodes/entityNode.js';
import { RootNode } from '../../nodes/rootNode.js';
import { QueryNode } from '../../nodes/queryNode.js';
import { MutationNode } from '../../nodes/mutationNode.js';
import { SubscriptionNode } from '../../nodes/subscriptionNode.js';
import { GQLString } from './gqlString.js';

export const generateTypeDefs = (root: RootNode) => {
  const types = [
    ...root.entities.map(makeEntityType),
    makeQuery(root.queries),
    makeMutation(root.mutations),
    makeSubscription(root.subscriptions),
  ].filter(nonNullableFilter);

  const inputs = [
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
    tsg.array(
      node.fields
        .filter(it => it.isGQLOpen)
        .map(GQLString.field)
        .map(tsg.string),
    ),
  );
};

const makeCreateInput = (node: EntityNode) => {
  if (!node.gqlEnabled || !node.creatable.gqlEnabled) return null;
  return tsg.propertyAssign(
    node.name.createInputName(),
    tsg.array(
      node.creatable.fields
        .filter(it => it.isGQLOpen)
        .map(GQLString.field)
        .map(tsg.string),
    ),
  );
};

const makeUpdateInput = (node: EntityNode) => {
  if (!node.gqlEnabled || !node.updateInput.gqlEnabled) return null;
  return tsg.propertyAssign(
    node.name.updateInputName(),
    tsg.array(
      node.updateInput.fields
        .filter(it => it.isGQLOpen)
        .map(GQLString.field)
        .map(tsg.string),
    ),
  );
};

const makeQuery = (queries: QueryNode[]) => {
  if (queries.length === 0) return null;
  return tsg.propertyAssign(
    'Query',
    tsg.array(queries.map(GQLString.query).map(tsg.string)),
  );
};

const makeMutation = (mutations: MutationNode[]) => {
  if (mutations.length === 0) return null;
  return tsg.propertyAssign(
    'Mutation',
    tsg.array(mutations.map(GQLString.mutation).map(tsg.string)),
  );
};

const makeSubscription = (subscriptions: SubscriptionNode[]) => {
  if (subscriptions.length === 0) return null;
  return tsg.propertyAssign(
    'Subscription',
    tsg.array(subscriptions.map(GQLString.subscription).map(tsg.string)),
  );
};
