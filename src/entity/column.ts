import {
  columnTypeToTsType,
  DBColumnTypes,
} from '../migration/column/columnTypes';
import { ReferenceColumn } from './referenceColumn';
import { columnTypeToGqlPrimitive } from '../generator/gql/columnToGqlType';
import { GqlPrimitive } from '../generator/gql/types';
import { ColumnData } from '../migration/column/columnData';
import { Table } from './table';
import { columnToSql } from '../sql/columnToSql';
import { SerializedColumn } from './serializedStore';

export interface Column {
  name: string;
  type: DBColumnTypes;
  getData(): ColumnData;
  toSql(): string;
  isReference(): this is ReferenceColumn;
  isNullable(): boolean;
  serialize(): SerializedColumn;
  gqlType(): GqlPrimitive;
  isNullableOnCreate(): boolean;
}

export class NormalColumn implements Column {
  constructor(public data: ColumnData, public table: Table) {}
  get name(): string {
    return this.data.columnName;
  }
  get type(): DBColumnTypes {
    return this.data.type;
  }

  getData(): ColumnData {
    return this.data;
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
    return columnToSql(this.data);
  }

  isReference() {
    return false;
  }

  serialize() {
    return this.data;
  }

  isNullable(): boolean {
    return !this.data.notNull;
  }

  isNullableOnCreate(): boolean {
    return (
      !this.data.notNull ||
      this.data.default !== undefined ||
      this.data.autoIncrement
    );
  }
}
