import { columnTypeToTsType, DBColumnTypes } from '../migration/column/columnTypes';
import { SqlValueType } from '../db/dbClient';
import { ParameterNode } from './parameterNode';
import { TypeNode } from './typeNode';
import { Column } from '../entity/column';
import { TableHandler } from '../entity/table';
import { PropertySignature } from '../generator/ts/code/node/propertySignature';
import { TypeReference } from '../generator/ts/code/node/type/typeReference';

export class FieldNode {
  static fromColumn(column: Column, table: TableHandler) {
    return new FieldNode(
      column.name,
      column.type,
      table.isColumnPrimary(column.name),
      column.getData().default,
      column.isNullable(),
      column.getData().autoIncrement,
      column.getData().defaultCurrentTimeStamp,
    );
  }
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
    return new PropertySignature(this.fieldName, new TypeReference(this.tsType()), false, true);
  }

  public hasDefaultValue(): boolean {
    return this.defaultValue !== undefined || this.onCreateCurrentTimestamp;
  }

  toParam(): ParameterNode {
    return new ParameterNode(this.fieldName, new TypeNode(this.dbType, false, this.isNullable));
  }

  toOptionalParam(): ParameterNode {
    return new ParameterNode(this.fieldName, new TypeNode(this.dbType, false, true));
  }
}
