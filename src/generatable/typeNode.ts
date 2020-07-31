import { TypeReference } from '../generator/ts/v2/code/node/type/typeReference';
import { UnionType } from '../generator/ts/v2/code/node/type/unionType';
import { TsType } from '../generator/ts/v2/code/node/type/type';
import { ArrayType } from '../generator/ts/v2/code/node/type/arrayType';

export class TypeNode {
  constructor(readonly typeName: string, readonly isArray: boolean, readonly isNullable: boolean) {}
  toTsType(): TsType {
    let type: TsType = new TypeReference(this.typeName);
    if (this.isNullable) type = new UnionType([type, new TypeReference('undefined')]);
    if (this.isArray) return new ArrayType(type);
    return type;
  }
}
