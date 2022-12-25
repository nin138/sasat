import {
  columnTypeToTsType,
  DBColumnTypes,
} from '../../migration/column/columnTypes.js';
import { PropertySignature } from '../../tsg/node/propertySignature.js';
import { tsg } from '../../tsg/index.js';
import { ParameterNode } from './parameterNode.js';
import { EntityTypeNode } from './typeNode.js';
import { SqlValueType } from '../../db/connectors/dbClient.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { Column } from '../../migration/serializable/column.js';

export class FieldNode {
  static fromColumn(column: Column, table: TableHandler): FieldNode {
    return new FieldNode(
      column.fieldName(),
      column.columnName(),
      column.dataType(),
      table.isColumnPrimary(column.columnName()),
      column.serialize().default,
      column.isNullable(),
      column.serialize().autoIncrement,
      column.serialize().defaultCurrentTimeStamp,
    );
  }
  constructor(
    public readonly fieldName: string,
    public readonly columnName: string,
    public readonly dbType: DBColumnTypes,
    public readonly isPrimary: boolean,
    public readonly defaultValue: SqlValueType | undefined,
    public readonly isNullable: boolean,
    public readonly isAutoIncrement: boolean,
    public readonly onCreateCurrentTimestamp: boolean,
  ) {}

  public isRequiredToIdentify(): boolean {
    return this.isPrimary;
  }

  public tsType(): string {
    return columnTypeToTsType(this.dbType) + (this.isNullable ? '| null' : '');
  }

  public isRequiredOnCreate(): boolean {
    if (this.isAutoIncrement) return false;
    return this.defaultValue == null && !this.isNullable;
  }

  public toPropertySignature(): PropertySignature {
    return new PropertySignature(
      this.fieldName,
      tsg.typeRef(this.tsType()),
      false,
      true,
    );
  }

  public hasDefaultValue(): boolean {
    return this.defaultValue !== undefined || this.onCreateCurrentTimestamp;
  }

  toParam(): ParameterNode {
    return new ParameterNode(
      this.fieldName,
      new EntityTypeNode(this.dbType, false, this.isNullable),
    );
  }

  toOptionalParam(): ParameterNode {
    return new ParameterNode(
      this.fieldName,
      new EntityTypeNode(this.dbType, false, true),
    );
  }
}
