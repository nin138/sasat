import { TypeReference } from '../generator/ts/v2/code/node/type/typeReference';
import { UnionType } from '../generator/ts/v2/code/node/type/unionType';
import { TsType } from '../generator/ts/v2/code/node/type/type';
import { ArrayType } from '../generator/ts/v2/code/node/type/arrayType';
import { columnTypeToTsType, DBColumnTypes } from '../migration/column/columnTypes';
import { EntityName } from '../entity/entityName';

export class TypeNode {
  constructor(readonly typeName: DBColumnTypes | EntityName, readonly isArray: boolean, readonly isNullable: boolean) {}
  toTsType(): TsType {
    let type: TsType = new TypeReference(
      this.typeName instanceof EntityName ? this.typeName.toString() : columnTypeToTsType(this.typeName),
    );
    if (this.isNullable) type = new UnionType([type, new TypeReference('null')]);
    if (this.isArray) return new ArrayType(type);
    return type;
  }
}
