import { Column } from '../../entity/column';
import { TableHandler } from '../../entity/table';
import { columnTypeToTsType, DBColumnTypes } from '../../migration/column/columnTypes';
import { PropertySignature } from '../../generator/ts/code/node/propertySignature';
import { tsg } from '../../generator/ts/code/factory';
import { ParameterNode } from './parameterNode';
import { TypeNode } from './typeNode';
import { SqlValueType } from '../../db/connectors/dbClient';

export class FieldNode {
  static fromColumn(column: Column, table: TableHandler): FieldNode {
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
    return new PropertySignature(this.fieldName, tsg.typeRef(this.tsType()), false, true);
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
