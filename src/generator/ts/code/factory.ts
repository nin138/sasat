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
const createFactory = <T, C extends new (...args: any[]) => T>(Create: C) => {
  // @ts-ignore
  return (...args: ConstructorParameters<C>) => new Create(...args);
};

const expressions = {
  arrowFunc: createFactory<Exp.ArrowFunction, typeof Exp.ArrowFunction>(Exp.ArrowFunction),
  async: createFactory<Exp.AsyncExpression, typeof Exp.AsyncExpression>(Exp.AsyncExpression),
  await: createFactory<Exp.AwaitExpression, typeof Exp.AwaitExpression>(Exp.AwaitExpression),
  binary: createFactory<Exp.BinaryExpression, typeof Exp.BinaryExpression>(Exp.BinaryExpression),
  call: createFactory<Exp.CallExpression, typeof Exp.CallExpression>(Exp.CallExpression),
  identifier: createFactory<Exp.Identifier, typeof Exp.Identifier>(Exp.Identifier),
  new: createFactory<Exp.NewExpression, typeof Exp.NewExpression>(Exp.NewExpression),
  nonNull: createFactory<Exp.NonNullExpression, typeof Exp.NonNullExpression>(Exp.NonNullExpression),
  parenthesis: createFactory<Exp.ParenthesizedExpression, typeof Exp.ParenthesizedExpression>(
    Exp.ParenthesizedExpression,
  ),
  propertyAccess: createFactory<Exp.PropertyAccessExpression, typeof Exp.PropertyAccessExpression>(
    Exp.PropertyAccessExpression,
  ),
  string: createFactory<Exp.StringLiteral, typeof Exp.StringLiteral>(Exp.StringLiteral),
  number: createFactory<Exp.NumericLiteral, typeof Exp.NumericLiteral>(Exp.NumericLiteral),
  array: createFactory<Exp.ArrayLiteral, typeof Exp.ArrayLiteral>(Exp.ArrayLiteral),
  object: createFactory<Exp.ObjectLiteral, typeof Exp.ObjectLiteral>(Exp.ObjectLiteral),
};

const types = {
  arrayType: createFactory<ArrayType, typeof ArrayType>(ArrayType),
  intersectionType: createFactory<IntersectionType, typeof IntersectionType>(IntersectionType),
  unionType: createFactory<UnionType, typeof UnionType>(UnionType),
  typeAlias: createFactory<TypeAliasDeclaration, typeof TypeAliasDeclaration>(TypeAliasDeclaration),
  typeLiteral: createFactory<TypeLiteral, typeof TypeLiteral>(TypeLiteral),
  typeRef: createFactory<TypeReference, typeof TypeReference>(TypeReference),
};

const others = {
  block: createFactory<Block, typeof Block>(Block),
  class: createFactory<Class, typeof Class>(Class),
  enum: createFactory<EnumDeclaration, typeof EnumDeclaration>(EnumDeclaration),
  enumMember: createFactory<EnumMember, typeof EnumMember>(EnumMember),
  ExpStatement: createFactory<ExpressionStatement, typeof ExpressionStatement>(ExpressionStatement),
  extends: createFactory<ExtendsClause, typeof ExtendsClause>(ExtendsClause),
  if: createFactory<IfStatement, typeof IfStatement>(IfStatement),
  implements: createFactory<ImplementsClause, typeof ImplementsClause>(ImplementsClause),
  interface: createFactory<TsInterface, typeof TsInterface>(TsInterface),
  method: createFactory<MethodDeclaration, typeof MethodDeclaration>(MethodDeclaration),
  parameter: createFactory<Parameter, typeof Parameter>(Parameter),
  propertyAssign: createFactory<PropertyAssignment, typeof PropertyAssignment>(PropertyAssignment),
  propertyDeclaration: createFactory<PropertyDeclaration, typeof PropertyDeclaration>(PropertyDeclaration),
  propertySignature: createFactory<PropertySignature, typeof PropertySignature>(PropertySignature),
  return: createFactory<ReturnStatement, typeof ReturnStatement>(ReturnStatement),
  spreadAssign: createFactory<SpreadAssignment, typeof SpreadAssignment>(SpreadAssignment),
  variable: createFactory<VariableDeclaration, typeof VariableDeclaration>(VariableDeclaration),
  methodModifiers: createFactory<MethodModifiers, typeof MethodModifiers>(MethodModifiers),
  propertyModifiers: createFactory<PropertyModifiers, typeof PropertyModifiers>(PropertyModifiers),
};

export const tsg = {
  ...expressions,
  ...types,
  ...others,
};
