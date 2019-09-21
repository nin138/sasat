import { DataStoreBuilder } from '../dataStore';
import { ColumnBuilder } from './columnBuilder';
import { AllColumnInfo } from './column';
import { ForeignKey } from '../table/foreignKey';

export interface ReferenceColumnInfo {
  table: string;
  column: string;
  unique: boolean;
}

export const referenceToColumnInfo = (
  store: DataStoreBuilder,
  reference: ReferenceColumnInfo,
): AllColumnInfo & { primary: boolean } => ({
  ...(store
    .table(reference.table)!
    .columns.find(it => it.build().columnName === reference.column) as ColumnBuilder).build(),
  primary: false,
  autoIncrement: false,
  unique: reference.unique,
});

export const referenceToForeignKey = (reference: ReferenceColumnInfo): ForeignKey => ({
  constraintName: `ref_${reference.table}_${reference.column}`,
  columnName: reference.column,
  referenceTable: reference.table,
  referenceColumn: reference.column,
});
