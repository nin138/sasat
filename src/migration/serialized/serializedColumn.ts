import { DBColumnTypes } from '../column/columnTypes';
import { SqlValueType } from '../../db/connectors/dbClient';
import { Relation } from '../..';
import { ForeignKeyReferentialAction } from '../data/foreignKey';

interface SerializedColumnBase {
  hasReference: boolean;
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
  targetTable: string;
  targetColumn: string;
  columnName: string;
  relation: Relation;
  relationName?: string;
  onUpdate?: ForeignKeyReferentialAction;
  onDelete?: ForeignKeyReferentialAction;
}

export interface SerializedReferenceColumn extends SerializedColumnBase {
  hasReference: true;
  reference: Reference;
}

export type SerializedColumn = SerializedNormalColumn | SerializedReferenceColumn;
