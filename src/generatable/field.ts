import { IrEntityField } from '../ir/entity';
import {
  columnTypeToTsType,
  DBColumnTypes,
} from '../migration/column/columnTypes';
import { SqlValueType } from '../db/dbClient';

export class FieldNode {
  constructor(
    public readonly fieldName: string,
    public readonly dbType: DBColumnTypes,
    public readonly isPrimary: boolean,
    public readonly defaultValue: SqlValueType | undefined,
    public readonly isNullable: boolean,
    public readonly isAutoIncrement: boolean,
  ) {}
  public isRequiredToIdentify() {
    return this.isPrimary;
  }

  public tsType() {
    return columnTypeToTsType(this.dbType) + (this.isNullable ? '| null' : '');
  }

  public isRequiredOnCreate() {
    if (this.isAutoIncrement) return false;
    return this.defaultValue == null && !this.isNullable;
  }
}
