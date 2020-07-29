import { TsCode } from '../../abstruct/tsCode';
import { PropertyAssignment } from '../propertyAssignment';
import { TsExpression } from '../../abstruct/expression';

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
  constructor(private readonly literals: Literal[]) {
    super();
    this.mergeImport(...literals);
  }

  protected toTsString(): string {
    return `[${this.literals.map(it => it.toString()).join(',')}]`;
  }
}

export class ObjectLiteral extends Literal {
  private properties: PropertyAssignment[] = [];

  constructor(...properties: PropertyAssignment[]) {
    super();
    this.addProperties(...properties);
  }

  addProperties(...properties: PropertyAssignment[]) {
    this.properties.push(...properties);
    this.mergeImport(...properties);
    return this;
  }

  protected toTsString(): string {
    return `{${this.properties.map(it => it.toString()).join(',')}}`;
  }
}
