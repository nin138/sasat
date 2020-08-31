import * as Exp from './node/expressions';
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
const createFactory = <T extends new (...args: any[]) => InstanceType<T>>(Constructor: T) => {
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
