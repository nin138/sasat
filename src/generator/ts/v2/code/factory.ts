import {
  ArrayLiteral,
  ArrowFunction,
  AsyncExpression,
  AwaitExpression,
  BinaryExpression,
  CallExpression,
  Identifier,
  NewExpression,
  NonNullExpression,
  NumericLiteral,
  ObjectLiteral,
  ParenthesizedExpression,
  PropertyAccessExpression,
  StringLiteral,
} from './node/expressions';
import { Parameter } from './node/parameter';
import { Block } from './node/block';
import { Class } from './node/class';
import { EnumDeclaration } from './node/enumDeclaration';
import { EnumMember } from './node/enumMember';
import { ExpressionStatement } from './node/ExpressionStatement';
import { ExtendsClause } from './node/extendsClause';
import { IfStatement } from './node/ifStatement';
import { ImplementsClause } from './node/implementsClause';
import { TsInterface } from './node/interface';
import { MethodDeclaration } from './node/methodDeclaration';
import { PropertyAssignment } from './node/propertyAssignment';
import { PropertyDeclaration } from './node/propertyDeclaration';
import { PropertySignature } from './node/propertySignature';
import { ReturnStatement } from './node/returnStatement';
import { SpreadAssignment } from './node/spreadAssignment';
import { VariableDeclaration } from './node/variableDeclaration';
import { ArrayType } from './node/type/arrayType';
import { IntersectionType } from './node/type/intersectionType';
import { UnionType } from './node/type/unionType';
import { TypeAliasDeclaration } from './node/type/typeAliasDeclaration';
import { TypeLiteral } from './node/type/typeLiteral';
import { TypeReference } from './node/type/typeReference';
import { MethodModifiers } from './node/modifier/methodModifiers';
import { PropertyModifiers } from './node/modifier/propertyModifiers';

/* eslint-disable @typescript-eslint/no-explicit-any */
const createFactory = <T, C extends new (...args: any[]) => T = any>(Create: C) => {
  // @ts-ignore
  return (...args: ConstructorParameters<C>) => new Create(...args);
};

const expressions = {
  arrowFunc: createFactory<ArrowFunction>(ArrowFunction),
  async: createFactory<AsyncExpression>(AsyncExpression),
  await: createFactory<AwaitExpression>(AwaitExpression),
  binary: createFactory<BinaryExpression>(BinaryExpression),
  call: createFactory<CallExpression>(CallExpression),
  identifier: createFactory<Identifier>(Identifier),
  new: createFactory<NewExpression>(NewExpression),
  nonNull: createFactory<NonNullExpression>(NonNullExpression),
  parenthesis: createFactory<ParenthesizedExpression>(ParenthesizedExpression),
  property: createFactory<PropertyAccessExpression>(PropertyAccessExpression),
  string: createFactory<StringLiteral>(StringLiteral),
  number: createFactory<NumericLiteral>(NumericLiteral),
  array: createFactory<ArrayLiteral>(ArrayLiteral),
  object: createFactory<ObjectLiteral>(ObjectLiteral),
};

const types = {
  arrayType: createFactory<ArrayType>(ArrayType),
  intersectionType: createFactory<IntersectionType>(IntersectionType),
  unionType: createFactory<UnionType>(UnionType),
  typeAlias: createFactory<TypeAliasDeclaration>(TypeAliasDeclaration),
  typeLiteral: createFactory<TypeLiteral>(TypeLiteral),
  typeRef: createFactory<TypeReference>(TypeReference),
};

const others = {
  block: createFactory<Block>(Block),
  class: createFactory<Class>(Class),
  enum: createFactory<EnumDeclaration>(EnumDeclaration),
  enumMember: createFactory<EnumMember>(EnumMember),
  ExpStatement: createFactory<ExpressionStatement>(ExpressionStatement),
  extends: createFactory<ExtendsClause>(ExtendsClause),
  if: createFactory<IfStatement>(IfStatement),
  implements: createFactory<ImplementsClause>(ImplementsClause),
  interface: createFactory<TsInterface>(TsInterface),
  method: createFactory<MethodDeclaration>(MethodDeclaration),
  parameter: createFactory<Parameter>(Parameter),
  propertyAssign: createFactory<PropertyAssignment>(PropertyAssignment),
  propertyDeclaration: createFactory<PropertyDeclaration>(PropertyDeclaration),
  propertySignature: createFactory<PropertySignature>(PropertySignature),
  return: createFactory<ReturnStatement>(ReturnStatement),
  spreadAssign: createFactory<SpreadAssignment>(SpreadAssignment),
  variable: createFactory<VariableDeclaration>(VariableDeclaration),
  methodModifiers: createFactory<MethodModifiers>(MethodModifiers),
  propertyModifiers: createFactory<PropertyModifiers>(PropertyModifiers),
};

export const tsg = {
  ...expressions,
  ...types,
  ...others,
};
