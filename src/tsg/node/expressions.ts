import { TsCode } from '../abstruct/tsCode.js';
import { ExpressionStatement } from './expressionStatement.js';
import { SpreadAssignment } from './spreadAssignment.js';
import { PropertyAssignment } from './propertyAssignment.js';
import { Parameter } from './parameter.js';
import { TsType } from './type/type.js';
import { Block } from './block.js';
import { tsValueString } from '../tsValueString.js';

export abstract class TsExpression extends TsCode {
  private readonly _codeType = 'expression';

  toStatement(): ExpressionStatement {
    return new ExpressionStatement(this);
  }

  call(...args: TsExpression[]): CallExpression {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new CallExpression(this, ...args);
  }

  nonNull(): NonNullExpression {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new NonNullExpression(this);
  }

  property(propertyName: string): PropertyAccessExpression {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new PropertyAccessExpression(this, propertyName);
  }

  as(type: TsType): AsExpression {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new AsExpression(this, type);
  }
}

export class CallExpression extends TsExpression {
  private readonly args: TsExpression[];
  private _typeArgs: TsType[] = [];
  constructor(
    private readonly identifier: TsExpression,
    ...args: TsExpression[]
  ) {
    super();
    this.mergeImport(identifier, ...args);
    this.args = args;
  }

  typeArgs(...typeArgs: TsType[]): CallExpression {
    this._typeArgs = typeArgs;
    this.mergeImport(...typeArgs);
    return this;
  }

  protected toTsString(): string {
    return (
      this.identifier.toString() +
      (this._typeArgs.length !== 0
        ? `<${this._typeArgs.map(it => it.toString()).join(',')}>`
        : '') +
      `(${this.args.map(it => it.toString()).join(',')})`
    );
  }
}

export abstract class Literal extends TsExpression {}

export class StringLiteral extends Literal {
  constructor(private value: string) {
    super();
  }

  protected toTsString(): string {
    return tsValueString(this.value);
  }
}

export class NumericLiteral extends Literal {
  constructor(private value: number) {
    super();
  }

  protected toTsString(): string {
    return this.value.toString();
  }
}

export class Boolean extends Literal {
  constructor(private value: boolean) {
    super();
  }

  protected toTsString(): string {
    return this.value.toString();
  }
}

export class ArrayLiteral extends Literal {
  constructor(private readonly literals: TsExpression[]) {
    super();
    this.mergeImport(...literals);
  }

  protected toTsString(): string {
    return `[${this.literals.map(it => it.toString()).join(',')}]`;
  }
}

type ObjectLiteralAssignable = PropertyAssignment | SpreadAssignment;
export class ObjectLiteral extends Literal {
  private properties: ObjectLiteralAssignable[] = [];

  constructor(...properties: ObjectLiteralAssignable[]) {
    super();
    this.addProperties(...properties);
  }

  addProperties(...properties: ObjectLiteralAssignable[]): this {
    this.properties.push(...properties);
    this.mergeImport(...properties);
    return this;
  }

  protected toTsString(): string {
    return `{${this.properties.map(it => it.toString()).join(',')}}`;
  }
}

export class ArrowFunction extends Literal {
  constructor(
    private params: Parameter[],
    private returnType: TsType | undefined,
    private body: TsExpression | Block,
  ) {
    super();
    this.mergeImport(...params, body, returnType);
  }

  protected toTsString(): string {
    const returnType = this.returnType ? `: ${this.returnType}` : '';
    return `(${Parameter.arrayToString(
      this.params,
    )})${returnType} => ${this.body.toString()}`;
  }

  toAsync(): AsyncExpression {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new AsyncExpression(this);
  }
}

export class AsyncExpression extends TsExpression {
  constructor(private readonly expression: ArrowFunction) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return 'async ' + this.expression.toString();
  }
}

export class AwaitExpression extends TsExpression {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return 'await ' + this.expression.toString();
  }
}

export type BinaryExpressionToken =
  | '==='
  | '!=='
  | '+'
  | '-'
  | '*'
  | '/'
  | '||'
  | '&&'
  | '=';
export class BinaryExpression extends TsExpression {
  constructor(
    private readonly left: TsExpression,
    private readonly operator: BinaryExpressionToken,
    private readonly right: TsExpression,
  ) {
    super();
    this.mergeImport(left, right);
  }

  protected toTsString(): string {
    return this.left + this.operator + this.right;
  }
}

export class Identifier extends TsExpression {
  constructor(private readonly name: string) {
    super();
  }

  protected toTsString(): string {
    return this.name;
  }

  importFrom(path: string): this {
    this.addImport([this.name], path);
    return this;
  }
}

export class NewExpression extends CallExpression {
  protected toTsString(): string {
    return 'new ' + super.toTsString();
  }
}

export class ParenthesizedExpression extends TsExpression {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return `(${this.expression})`;
  }
}

export class NonNullExpression extends TsExpression {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return `${this.expression}!`;
  }
}

export class PropertyAccessExpression extends TsExpression {
  constructor(
    private readonly expression: TsExpression,
    private readonly propertyName: string,
  ) {
    super();
    this.mergeImport(expression);
  }

  protected toTsString(): string {
    return `${this.expression.toString()}.${this.propertyName}`;
  }
}

export class AsExpression extends TsExpression {
  constructor(
    private readonly expression: TsExpression,
    private readonly asType: TsType,
  ) {
    super();
    this.mergeImport(expression, asType);
  }

  protected toTsString(): string {
    return this.expression.toString() + ' as ' + this.asType.toString();
  }
}

export class TernaryExpression extends TsExpression {
  constructor(
    private readonly condition: TsExpression,
    private readonly left: TsExpression,
    private readonly right: TsExpression,
  ) {
    super();
    this.mergeImport(condition, left, right);
  }
  protected toTsString(): string {
    return `(${this.condition})?${this.left}:${this.right}`;
  }
}

export class SpreadElement extends TsExpression {
  constructor(private readonly expression: TsExpression) {
    super();
    this.mergeImport(expression);
  }
  protected toTsString(): string {
    return `...${this.expression}`;
  }
}
