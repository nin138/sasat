import { columnTypeToTsType, DBColumnTypes } from '../../migration/column/columnTypes';
import { PropertySignature } from '../../generator/ts/code/node/propertySignature';
import { tsg } from '../../generator/ts/code/factory';
import { ParameterNode } from './parameterNode';
import { TypeNode } from './typeNode';
import { SqlValueType } from '../../db/connectors/dbClient';
import { TableHandler } from '../../migration/serializable/table';
import { Column } from '../../migration/serializable/column';

export class FieldNode {
  static fromColumn(column: Column, table: TableHandler): FieldNode {
    return new FieldNode(
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
    public readonly dbType: DBColumnTypes,
    public readonly isPrimary: boolean,
    public readonly defaultValue: SqlValueType | undefined,
    public readonly isNullable: boolean,
    public readonly isAutoIncrement: boolean,
    public readonly onCreateCurrentTimestamp: boolean,
  ) {}

  static normalizeFieldName(fieldName: string): string {
    return /^[0-9].*/.test(fieldName) ? '_' + fieldName : fieldName;
  }

  public normalizedName(): string {
    return FieldNode.normalizeFieldName(this.fieldName);
  }

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
    return new PropertySignature(FieldNode.normalizeFieldName(this.fieldName), tsg.typeRef(this.tsType()), false, true);
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
