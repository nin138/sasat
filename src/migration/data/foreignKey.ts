export type ForeignKeyReferentialAction =
 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'NO ACTION';

export interface ForeignKey {
  constraintName: string;
  columnName: string;
  referenceTable: string;
  referenceColumn: string;
  onUpdate?: ForeignKeyReferentialAction;
  onDelete?: ForeignKeyReferentialAction;
}
