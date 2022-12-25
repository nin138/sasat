import * as Exp from './node/expressions.js';
import { Parameter } from './node/parameter.js';
import { Block } from './node/block.js';
import { Class } from './node/class.js';
import { EnumDeclaration } from './node/enumDeclaration.js';
import { EnumMember } from './node/enumMember.js';
import { ExpressionStatement } from './node/expressionStatement.js';
import { ExtendsClause } from './node/extendsClause.js';
import { IfStatement } from './node/ifStatement.js';
import { ImplementsClause } from './node/implementsClause.js';
import { TsInterface } from './node/interface.js';
import { MethodDeclaration } from './node/methodDeclaration.js';
import { PropertyAssignment } from './node/propertyAssignment.js';
import { PropertyDeclaration } from './node/propertyDeclaration.js';
import { PropertySignature } from './node/propertySignature.js';
import { ReturnStatement } from './node/returnStatement.js';
import { SpreadAssignment } from './node/spreadAssignment.js';
import { VariableDeclaration } from './node/variableDeclaration.js';
import { ArrayType } from './node/type/arrayType.js';
import { IntersectionType } from './node/type/intersectionType.js';
import { UnionType } from './node/type/unionType.js';
import { TypeAliasDeclaration } from './node/type/typeAliasDeclaration.js';
import { TypeLiteral } from './node/type/typeLiteral.js';
import { TypeReference } from './node/type/typeReference.js';
import { MethodModifiers } from './node/modifier/methodModifiers.js';
import { PropertyModifiers } from './node/modifier/propertyModifiers.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
const createFactory = <T extends new (...args: any[]) => InstanceType<T>>(
  Constructor: T,
) => {
  return (...args: ConstructorParameters<T>) => new Constructor(...args);
};

const expressions = {
  arrowFunc: createFactory(Exp.ArrowFunction),
  async: createFactory(Exp.AsyncExpression),
  await: createFactory(Exp.AwaitExpression),
  binary: createFactory(Exp.BinaryExpression),
  call: createFactory(Exp.CallExpression),
  identifier: createFactory(Exp.Identifier),
  new: createFactory(Exp.NewExpression),
  nonNull: createFactory(Exp.NonNullExpression),
  parenthesis: createFactory(Exp.ParenthesizedExpression),
  propertyAccess: createFactory(Exp.PropertyAccessExpression),
  string: createFactory(Exp.StringLiteral),
  number: createFactory(Exp.NumericLiteral),
  array: createFactory(Exp.ArrayLiteral),
  object: createFactory(Exp.ObjectLiteral),
  as: createFactory(Exp.AsExpression),
};

const types = {
  arrayType: createFactory(ArrayType),
  intersectionType: createFactory(IntersectionType),
  unionType: createFactory(UnionType),
  typeAlias: createFactory(TypeAliasDeclaration),
  typeLiteral: createFactory(TypeLiteral),
  typeRef: createFactory(TypeReference),
};

const others = {
  block: createFactory(Block),
  class: createFactory(Class),
  enum: createFactory(EnumDeclaration),
  enumMember: createFactory(EnumMember),
  ExpStatement: createFactory(ExpressionStatement),
  extends: createFactory(ExtendsClause),
  if: createFactory(IfStatement),
  implements: createFactory(ImplementsClause),
  interface: createFactory(TsInterface),
  method: createFactory(MethodDeclaration),
  parameter: createFactory(Parameter),
  propertyAssign: createFactory(PropertyAssignment),
  propertyDeclaration: createFactory(PropertyDeclaration),
  propertySignature: createFactory(PropertySignature),
  return: createFactory(ReturnStatement),
  spreadAssign: createFactory(SpreadAssignment),
  variable: createFactory(VariableDeclaration),
  methodModifiers: createFactory(MethodModifiers),
  propertyModifiers: createFactory(PropertyModifiers),
};

export const tsg = {
  ...expressions,
  ...types,
  ...others,
};
