import { TsCode } from '../../abstruct/tsCode';
import { PropertyAssignment } from '../propertyAssignment';
import { TsExpression } from '../../abstruct/expression';
import { SpreadAssignment } from '../spreadAssignment';

export abstract class Literal extends TsExpression {}

export class StringLiteral extends Literal {
  constructor(private value: string) {
    super();
  }

  protected toTsString(): string {
    return `'${this.value.replace("'", "\\'")}'`;
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

  addProperties(...properties: ObjectLiteralAssignable[]) {
    this.properties.push(...properties);
    this.mergeImport(...properties);
    return this;
  }

  protected toTsString(): string {
    return `{${this.properties.map(it => it.toString()).join(',')}}`;
  }
}
