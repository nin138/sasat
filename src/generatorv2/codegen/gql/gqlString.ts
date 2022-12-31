import { ArgNode, TypeNode } from '../../nodes/typeNode.js';
import {
  FieldNode,
  ReferencedNode,
  ReferenceNode,
} from '../../nodes/entityNode.js';
import { MutationNode } from '../../nodes/mutationNode.js';
import { SubscriptionNode } from '../../nodes/subscriptionNode.js';
import { QueryNode } from '../../nodes/queryNode.js';
import { EntityName } from '../../nodes/entityName.js';

export const GQLString = {
  args: (args: ArgNode[]): string => {
    if (args.length === 0) return '';
    return `(${args
      .map(arg => `${arg.name}: ${GQLString.type(arg.type)}`)
      .join(',')})`;
  },
  field: (field: FieldNode): string => {
    return `${field.fieldName}: ${fieldGqlType(field)}`;
  },
  referenceField: (ref: ReferenceNode): string => {
    return `${ref.fieldName}: ${makeGQLType(
      EntityName.fromTableName(ref.parentTableName).name,
      ref.isNullable,
      ref.isArray,
    )}`;
  },
  referencedField: (ref: ReferencedNode): string => {
    return `${ref.fieldName}: ${makeGQLType(
      EntityName.fromTableName(ref.childTable).name,
      ref.isNullable,
      ref.isArray,
    )}`;
  },
  query: (node: QueryNode) => {
    return `${node.queryName}${GQLString.args(node.args)}: ${GQLString.type(
      node.returnType,
    )}`;
  },
  mutation: (node: MutationNode) => {
    return `${node.mutationName}${GQLString.args(node.args)}: ${GQLString.type(
      node.returnType,
    )}`;
  },
  subscription: (node: SubscriptionNode) => {
    return `${node.subscriptionName}${GQLString.args(
      node.args,
    )}: ${GQLString.type(node.returnType)}`;
  },
  type: (node: TypeNode) => {
    const type = node.nullable ? node.typeName : node.typeName + '!';
    if (node.array) return `[${type}]!`;
    return type;
  },
};

const fieldGqlType = (field: FieldNode): string => {
  return makeGQLType(field.gqlType, field.isNullable, field.isArray);
};

export const makeGQLType = (
  typeName: string,
  isNullable: boolean,
  isArray: boolean,
) => {
  const type = isNullable ? typeName : typeName + '!';
  if (isArray) return `[${type}]!`;
  return type;
};
