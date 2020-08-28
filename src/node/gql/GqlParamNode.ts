import { GqlPrimitive } from '../../generator/gql/types';

export class GqlParamNode {
  constructor(
    readonly name: string,
    readonly type: GqlPrimitive | string,
    readonly isNullable: boolean,
    readonly isArray: boolean,
    readonly isReference: boolean,
  ) {}

  toString() {
    let type = this.type;
    if (!this.isNullable) type = type + '!';
    if (this.isArray) type = `[${type}]${this.isNullable ? '' : '!'}`;
    return type;
  }

  static paramsToString(params: GqlParamNode[]) {
    return params.length === 0 ? '' : `(${params.map(it => `${it.name}: ${it}`).join(', ')})`;
  }
}
