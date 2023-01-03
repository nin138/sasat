import {
  DBColumnTypes,
  DBDateTypes,
  DBFloatingTypes,
  DBIntegerTypes,
  DBNumberTypes,
  DBStringTypes,
  DBTextTypes,
} from '../column/columnTypes.js';
import { SqlValueType } from '../../db/connectors/dbClient.js';
import {
  ColumnOptions,
  defaultColumnOption,
  SerializedNormalColumn,
} from '../serialized/serializedColumn.js';

export abstract class ColumnBuilder {
  protected _primary = false;
  protected _notNull = true;
  protected _unique = false;
  protected _zerofill = false;
  protected _signed: boolean | undefined;
  protected _autoIncrement = false;
  protected _default: SqlValueType | undefined;
  protected _defaultCurrentTimeStamp = false;
  protected _onUpdateCurrentTimeStamp = false;
  protected _fieldName: string;
  protected _option: ColumnOptions = defaultColumnOption;
  protected constructor(
    readonly name: string,
    protected type: DBColumnTypes,
    protected length?: number,
    protected scale?: number,
  ) {
    this._fieldName = name;
  }

  fieldName(fieldName: string): this {
    this._fieldName = fieldName;
    return this;
  }

  notNull(): this {
    this._notNull = true;
    return this;
  }
  nullable(): this {
    this._notNull = false;
    return this;
  }
  primary(): this {
    this._primary = true;
    return this;
  }
  unique(): this {
    this._unique = true;
    return this;
  }
  default(value: SqlValueType | undefined): this {
    this._default = value;
    return this;
  }
  updatable(updatable: boolean): this {
    this._option = { ...this._option, updatable };
    return this;
  }
  build(): {
    data: SerializedNormalColumn;
    isPrimary: boolean;
    isUnique: boolean;
  } {
    return {
      data: {
        hasReference: false,
        columnName: this.name,
        fieldName: this._fieldName,
        type: this.type,
        length: this.length,
        scale: this.scale,
        notNull: this._notNull,
        zerofill: this._zerofill,
        signed: this._signed,
        autoIncrement: this._autoIncrement,
        default: this._default,
        defaultCurrentTimeStamp: this._defaultCurrentTimeStamp,
        onUpdateCurrentTimeStamp: this._onUpdateCurrentTimeStamp,
        option: this._option,
      },
      isPrimary: this._primary,
      isUnique: this._unique,
    };
  }
}

export class StringColumnBuilder extends ColumnBuilder {
  constructor(
    readonly name: string,
    protected type: DBStringTypes,
    protected length?: number,
  ) {
    super(name, type);
  }

  default(value: string | null | undefined): this {
    this._default = value;
    return this;
  }
}

export class TextColumnBuilder extends ColumnBuilder {
  constructor(readonly name: string, protected type: DBTextTypes) {
    super(name, type);
  }

  default(value: string | null | undefined): this {
    this._default = value;
    return this;
  }
}

export class NumberColumnBuilder extends ColumnBuilder {
  constructor(
    name: string,
    type: DBNumberTypes,
    length?: number,
    scale?: number,
  ) {
    super(name, type, length, scale);
  }
  signed(): this {
    this._signed = true;
    return this;
  }
  unsigned(): this {
    this._signed = false;
    return this;
  }
  zerofill(): this {
    this._zerofill = true;
    return this;
  }
  default(value: number | null | undefined): this {
    this._default = value;
    return this;
  }
}

export class IntegerColumnBuilder extends NumberColumnBuilder {
  constructor(
    readonly name: string,
    protected type: DBIntegerTypes,
    protected length?: number,
  ) {
    super(name, type, length);
  }
  autoIncrement(): this {
    this._autoIncrement = true;
    return this;
  }
}

export class FloatColumnBuilder extends NumberColumnBuilder {
  constructor(
    readonly name: string,
    protected type: DBFloatingTypes,
    protected length?: number,
    protected scale?: number,
  ) {
    super(name, type, length, scale);
  }
  autoIncrement(): this {
    this._autoIncrement = true;
    return this;
  }
}

export class DecimalColumnBuilder extends NumberColumnBuilder {
  constructor(
    readonly name: string,
    protected type: DBColumnTypes.decimal,
    protected length?: number,
    protected scale?: number,
  ) {
    super(name, type, length, scale);
  }
}

export class DateColumnBuilder extends ColumnBuilder {
  constructor(readonly name: string, protected type: DBDateTypes) {
    super(name, type);
  }
  default(value: string | number | null | undefined): this {
    this._default = value;
    return this;
  }
}

export class TimeStampColumnBuilder extends ColumnBuilder {
  constructor(
    readonly name: string,
    protected type: DBColumnTypes.timestamp | DBColumnTypes.dateTime,
  ) {
    super(name, type);
  }
  default(value: 'CURRENT_TIMESTAMP' | string | null | undefined): this {
    this._default = value;
    return this;
  }
  defaultCurrentTimeStamp(): this {
    this._defaultCurrentTimeStamp = true;
    return this.default('CURRENT_TIMESTAMP');
  }
  onUpdateCurrentTimeStamp(): this {
    this._onUpdateCurrentTimeStamp = true;
    return this;
  }
}

export class BooleanColumnBuilder extends ColumnBuilder {
  constructor(name: string) {
    super(name, DBColumnTypes.boolean);
  }
  default(value: boolean | null): this {
    this._default = value;
    return this;
  }
}
