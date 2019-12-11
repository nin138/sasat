import { DataStore } from '../dataStore';
import { ColumnBuilder } from './columnBuilder';
import { AllColumnInfo } from './column';
import { ForeignKey } from '../table/foreignKey';

export interface ColumnReference {
  targetTable: string;
  targetColumn: string;
  columnName: string;
  unique: boolean;
}

export const referenceToColumnInfo = (
  store: DataStore,
  reference: ColumnReference,
): AllColumnInfo & { primary: boolean } => ({
  ...(store
    .table(reference.targetTable)!
    .columns.find(it => it.build().columnName === reference.targetColumn) as ColumnBuilder).build(),
  primary: false,
  autoIncrement: false,
  unique: reference.unique,
});

export const referenceToForeignKey = (reference: ColumnReference): ForeignKey => ({
  constraintName: `ref_${reference.targetTable}_${reference.targetColumn}`,
  columnName: reference.targetColumn,
  referenceTable: reference.targetTable,
  referenceColumn: reference.targetColumn,
});
