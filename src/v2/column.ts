import { columnTypeToTsType, DBColumnTypes } from '../migration/column/columnTypes';
import { SqlValueType } from '../db/dbClient';
import { ReferenceColumn, ReferenceColumnData } from './referenceColumn';
import { columnTypeToGqlPrimitive } from '../generator/gql/sasatToGqlType';
import { GqlPrimitive } from '../generator/gql/types';
import { ColumnData } from '../migration/column/columnData';
import { Table } from './table';
import { columnToSql } from './sql/columnToSql';

export interface Column {
  name: string;
  toSql: () => string;
  isReference: () => this is ReferenceColumn;
}

export class NormalColumn implements Column {
  constructor(public data: ColumnData, public table: Table) {}
  get name(): string {
    return this.data.columnName;
  }
  sqlType(): DBColumnTypes {
    return this.data.type;
  }
  tsType(): string {
    return columnTypeToTsType(this.sqlType());
  }
  gqlType(): GqlPrimitive {
    return columnTypeToGqlPrimitive(this.sqlType());
  }

  toSql(): string {
    return columnToSql(this);
  }

  isReference() {
    return false;
  }
}

// TODO RM
export interface AllColumnInfo {
  columnName: string;
  type: DBColumnTypes;
  unique: boolean;
  zerofill: boolean;
  autoIncrement: boolean;
  length?: number;
  scale?: number;
  notNull?: boolean;
  signed?: boolean;
  default?: SqlValueType;
  onUpdateCurrentTimeStamp: boolean;
  reference?: ReferenceColumnData;
}
