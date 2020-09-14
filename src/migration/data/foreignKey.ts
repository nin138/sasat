export enum ForeignKeyReferentialAction {
  Restrict = 'RESTRICT',
  Cascade = 'CASCADE',
  SetNull = 'SET NULL',
  NoAction = 'NO ACTION',
}

export interface ForeignKey {
  constraintName: string;
  columnName: string;
  referenceTable: string;
  referenceColumn: string;
  onUpdate?: ForeignKeyReferentialAction;
  onDelete?: ForeignKeyReferentialAction;
}
