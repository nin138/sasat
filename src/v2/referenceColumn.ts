import { Column, NormalColumn } from './column';
import { ForeignKey, ForeignKeyReferentialAction } from '../migration/table/foreignKey';
import { TableHandler } from './table';
import { columnToSql } from './sql/columnToSql';

export interface ReferenceColumnData {
  type: 'REFERENCE';
  targetTable: string;
  targetColumn: string;
  columnName: string;
  unique: boolean; // TODO change to Relation
  onUpdate?: ForeignKeyReferentialAction;
  onDelete?: ForeignKeyReferentialAction;
}

export class ReferenceColumn implements Column {
  constructor(public data: ReferenceColumnData, public table: TableHandler) {}
  get name() {
    return this.data.columnName;
  }
  toSql(): string {
    return columnToSql(this.getRootColumn());
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
}

export const referenceToForeignKey = (reference: ReferenceColumnData): ForeignKey => ({
  constraintName: `ref_${reference.targetTable}_${reference.targetColumn}`,
  columnName: reference.targetColumn,
  referenceTable: reference.targetTable,
  referenceColumn: reference.targetColumn,
});
