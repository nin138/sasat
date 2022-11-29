import {
  columnTypeToTsType,
  DBColumnTypes,
} from '../../migration/column/columnTypes.js';
import { TsType } from '../../generator/ts/code/node/type/type.js';
import { tsg } from '../../generator/ts/code/factory.js';
import { columnTypeToGqlPrimitive } from '../../generator/gql/columnToGqlType.js';
import { EntityName } from './entityName.js';
import { TypeDefGenerator } from '../../generator/ts/gql/typeDefGenerator.js';

export abstract class TypeNode {
  protected constructor(
    readonly typeName: DBColumnTypes | EntityName,
    readonly isArray: boolean,
    readonly isNullable: boolean,
    readonly isArrayNullable = false,
  ) {}

  abstract toTsType(): TsType;

  toGqlString(): string {
    let type =
      this.typeName instanceof EntityName
        ? this.typeName.name
        : columnTypeToGqlPrimitive(this.typeName);
    if (!this.isNullable) type = type + '!';
    if (this.isArray) type = `[${type}]${this.isArrayNullable ? '' : '!'}`;
    return type;
  }
}

export class ListQueryOptionTypeNode extends TypeNode {
  constructor() {
    super(new EntityName(TypeDefGenerator.ListQueryOptionType), false, true);
  }

  toTsType(): TsType {
    return tsg
      .typeRef(TypeDefGenerator.ListQueryOptionType)
      .importFrom('sasat');
  }
}

export class EntityTypeNode extends TypeNode {
  constructor(
    typeName: DBColumnTypes | EntityName,
    isArray: boolean,
    isNullable: boolean,
    isArrayNullable = false,
  ) {
    super(typeName, isArray, isNullable, isArrayNullable);
  }

  toTsType(): TsType {
    let type: TsType = tsg.typeRef(
      this.typeName instanceof EntityName
        ? this.typeName.toString()
        : columnTypeToTsType(this.typeName),
    );
    if (this.isNullable) type = tsg.unionType([type, tsg.typeRef('null')]);
    if (this.isArray) return tsg.arrayType(type);
    return type;
  }
}
