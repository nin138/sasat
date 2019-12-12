import { columnTypeToTsType, SasatColumnTypes } from './columnTypes';
import { SqlValueType } from '../../db/dbClient';
import { ColumnReference } from './referenceColumn';
import { columnTypeToGqlPrimitive } from '../../generator/gql/sasatToGqlType';
import { GqlPrimitive } from '../../generator/gql/types';
import { ColumnData } from './columnData';
import * as SqlString from 'sqlstring';

export class Column {
  constructor(public data: ColumnData) {}
  get name(): string {
    return this.data.columnName;
  }
  sqlType(): SasatColumnTypes {
    return this.data.type;
  }
  tsType(): string {
    return columnTypeToTsType(this.sqlType());
  }
  gqlType(): GqlPrimitive {
    return columnTypeToGqlPrimitive(this.sqlType());
  }

  // TODO Use user-defined type guard
  toSql(): string {
    const words = [this.name, this.sqlType()];
    // @ts-ignore
    if (this.data.length)
      // @ts-ignore
      words.push(`(${[this.data.length, this.data.scale].filter(it => it !== undefined).join(',')})`);
    // @ts-ignore
    if (this.data.signed === true) words.push('SIGNED');
    // @ts-ignore
    else if (this.data.signed === false) words.push('UNSIGNED');
    // @ts-ignore
    if (this.data.zerofill) words.push('ZEROFILL');
    // @ts-ignore
    if (this.data.autoIncrement) words.push('AUTO_INCREMENT');
    if (this.data.notNull) words.push('NOT NULL');
    else if (!this.data.notNull) words.push('NULL');
    if (
      (this.sqlType() === SasatColumnTypes.timestamp || this.sqlType() === SasatColumnTypes.dateTime) &&
      this.data.default === 'CURRENT_TIMESTAMP'
    )
      words.push('DEFAULT CURRENT_TIMESTAMP');
    else if (this.data.default !== undefined) words.push('DEFAULT ' + SqlString.escape(this.data.default));
    // @ts-ignore
    if (this.data.onUpdateCurrentTimeStamp) words.push('ON UPDATE CURRENT_TIMESTAMP');
    return words.join(' ');
  }
}

export interface AllColumnInfo {
  columnName: string;
  type: SasatColumnTypes;
  unique: boolean;
  zerofill: boolean;
  autoIncrement: boolean;
  length?: number;
  scale?: number;
  notNull?: boolean;
  signed?: boolean;
  default?: SqlValueType;
  onUpdateCurrentTimeStamp: boolean;
  reference?: ColumnReference;
}
