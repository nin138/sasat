import {
  columnTypeToTsType,
  DBColumnTypes,
} from '../migration/column/columnTypes';
import { SqlValueType } from '../db/dbClient';
import { PropertySignature } from '../generator/ts/v2/code/node/propertySignature';

export class FieldNode {
  constructor(
    public readonly fieldName: string,
    public readonly dbType: DBColumnTypes,
    public readonly isPrimary: boolean,
    public readonly defaultValue: SqlValueType | undefined,
    public readonly isNullable: boolean,
    public readonly isAutoIncrement: boolean,
    public readonly onCreateCurrentTimestamp: boolean,
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

  public toPropertySignature(): PropertySignature {
    return new PropertySignature(this.fieldName, this.tsType(), false, true);
  }

  public hasDefaultValue(): boolean {
    return this.defaultValue !== undefined || this.onCreateCurrentTimestamp;
  }
}
