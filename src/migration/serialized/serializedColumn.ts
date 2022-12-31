import { DBColumnTypes } from '../column/columnTypes.js';
import { SqlValueType } from '../../db/connectors/dbClient.js';
import { ForeignKeyReferentialAction } from '../data/foreignKey.js';
import { SqlString } from '../../runtime/sql/sqlString.js';
import { Relation } from '../data/relation.js';

interface SerializedColumnBase {
  hasReference: boolean;
  fieldName: string;
  columnName: string;
  type: DBColumnTypes;
  notNull: boolean;
  default: SqlValueType | undefined;
  zerofill: boolean;
  signed: boolean | undefined;
  autoIncrement: boolean;
  length: number | undefined;
  scale: number | undefined;
  defaultCurrentTimeStamp: boolean;
  onUpdateCurrentTimeStamp: boolean;
}

export interface SerializedNormalColumn extends SerializedColumnBase {
  hasReference: false;
}

export interface Reference {
  parentTable: string;
  parentColumn: string;
  columnName: string;
  relation: Relation;
  parentFieldName?: string;
  fieldName?: string;
  relationName?: string;
  onUpdate?: ForeignKeyReferentialAction;
  onDelete?: ForeignKeyReferentialAction;
  noFKey?: boolean;
}

export const referenceToSql = (
  constraintName: string,
  ref: Reference,
): string => {
  const onUpdate = ref.onUpdate ? ` ON UPDATE ${ref.onUpdate}` : '';
  const onDelete = ref.onDelete ? ` ON DELETE ${ref.onDelete}` : '';
  return (
    `CONSTRAINT ${constraintName} ` +
    `FOREIGN KEY(${ref.columnName}) ` +
    `REFERENCES ${SqlString.escapeId(ref.parentTable)}(${SqlString.escapeId(
      ref.parentColumn,
    )})` +
    onUpdate +
    onDelete
  );
};

export interface SerializedReferenceColumn extends SerializedColumnBase {
  hasReference: true;
  reference: Reference;
}

export type SerializedColumn =
  | SerializedNormalColumn
  | SerializedReferenceColumn;
