import { Column, NormalColumn } from './column';
import { ForeignKey, ForeignKeyReferentialAction } from './foreignKey';
import { TableHandler } from './table';
import { columnToSql } from '../sql/columnToSql';
import { GqlPrimitive } from '../generator/gql/types';
import { Relation } from './relation';

export interface ReferenceColumnData {
  type: 'REFERENCE';
  targetTable: string;
  // TODO optional
  targetColumn: string;
  columnName: string;
  relation: Relation;
  relationName?: string;
  onUpdate?: ForeignKeyReferentialAction;
  onDelete?: ForeignKeyReferentialAction;
}

export class ReferenceColumn implements Column {
  constructor(public data: ReferenceColumnData, public table: TableHandler) {}
  get name() {
    return this.data.columnName;
  }

  get type() {
    return this.getRootColumn().type;
  }

  getData() {
    return this.getRootColumn().data;
  }

  toSql(): string {
    return columnToSql({ ...this.getRootColumn().data, ...{ autoIncrement: false, default: undefined, columnName: this.name } });
  }

  getTargetColumn() {
    return this.table.store.table(this.data.targetTable)!.column(this.data.targetColumn)!;
  }

  getRootColumn(): NormalColumn {
    let column = this.getTargetColumn();
    while (column.isReference() === true) {
      column = (column as ReferenceColumn).getTargetColumn();
    }
    return column as NormalColumn;
  }

  isReference(): this is ReferenceColumn {
    return true;
  }

  serialize() {
    return this.data;
  }

  isNullable(): boolean {
    return false;
  }

  gqlType(): GqlPrimitive {
    return this.getRootColumn().gqlType();
  }

  isNullableOnCreate(): boolean {
    return false;
  }

  getConstraintName(): string {
    return `ref_${this.table.tableName}_${this.name}__${this.data.targetTable}_${this.data.targetColumn}`;
  }
}

export const referenceToForeignKey = (reference: ReferenceColumnData): ForeignKey => ({
  constraintName: `ref_${reference.targetTable}_${reference.targetColumn}`,
  columnName: reference.targetColumn,
  referenceTable: reference.targetTable,
  referenceColumn: reference.targetColumn,
});
