import { ForeignKey, ForeignKeyReferentialAction } from "../../types/foreignKey";
import {
  AllColumnInfo,
  SasatColumnTypes,
  SasatDateTypes,
  SasatFloatingTypes,
  SasatIntegerTypes,
  SasatNumberTypes,
  SasatStringTypes,
  SasatTextTypes,
} from "../../types/column";

export abstract class ColumnBuilder {
  protected _primary = false;
  protected _notNull: boolean | undefined;
  protected _unique = false;
  protected _foreignKey: ForeignKey | undefined;
  protected _zerofill = false;
  protected _signed: boolean | undefined;
  protected _autoIncrement = false;
  protected _default: number | string | boolean | null | undefined;
  protected _onUpdateCurrentTimeStamp = false;
  protected constructor(
    readonly name: string,
    protected type: SasatColumnTypes,
    protected length?: number,
    protected scale?: number,
  ) {}

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
  foreignKey(
    constraintName: string,
    table: string,
    column: string,
    onUpdate: ForeignKeyReferentialAction = ForeignKeyReferentialAction.Restrict,
    onDelete: ForeignKeyReferentialAction = ForeignKeyReferentialAction.Restrict,
  ): this {
    this._foreignKey = {
      constraintName,
      columnName: this.name,
      referenceTable: table,
      referenceColumn: column,
      onUpdate,
      onDelete,
    };
    return this;
  }
  default(value: any): this {
    this._default = value;
    return this;
  }
  build(): AllColumnInfo {
    return {
      columnName: this.name,
      type: this.type,
      length: this.length,
      scale: this.scale,
      primary: this._primary,
      notNull: this._notNull,
      unique: this._unique,
      foreignKey: this._foreignKey,
      zerofill: this._zerofill,
      signed: this._signed,
      autoIncrement: this._autoIncrement,
      default: this._default,
      onUpdateCurrentTimeStamp: this._onUpdateCurrentTimeStamp,
    };
  }
}

export class StringColumnBuilder extends ColumnBuilder {
  constructor(readonly name: string, protected type: SasatStringTypes, protected length?: number) {
    super(name, type);
  }

  default(value: string | null | undefined): this {
    this._default = value;
    return this;
  }
}

export class TextColumnBuilder extends ColumnBuilder {
  constructor(readonly name: string, protected type: SasatTextTypes) {
    super(name, type);
  }

  default(value: string | null | undefined): this {
    this._default = value;
    return this;
  }
}

export class NumberColumnBuilder extends ColumnBuilder {
  constructor(name: string, type: SasatNumberTypes, length?: number, scale?: number) {
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
  constructor(readonly name: string, protected type: SasatIntegerTypes, protected length?: number) {
    super(name, type, length);
  }
  autoIncrement() {
    this._autoIncrement = true;
    return this;
  }
}

export class FloatColumnBuilder extends NumberColumnBuilder {
  constructor(
    readonly name: string,
    protected type: SasatFloatingTypes,
    protected length?: number,
    protected scale?: number,
  ) {
    super(name, type, length, scale);
  }
  autoIncrement() {
    this._autoIncrement = true;
    return this;
  }
}

export class DecimalColumnBuilder extends NumberColumnBuilder {
  constructor(
    readonly name: string,
    protected type: SasatColumnTypes.decimal,
    protected length?: number,
    protected scale?: number,
  ) {
    super(name, type, length, scale);
  }
}

export class DateColumnBuilder extends ColumnBuilder {
  constructor(readonly name: string, protected type: SasatDateTypes) {
    super(name, type);
  }
  default(value: string | number | null | undefined): this {
    this._default = value;
    return this;
  }
}

export class TimeStampColumnBuilder extends ColumnBuilder {
  constructor(readonly name: string, protected type: SasatColumnTypes.timestamp) {
    super(name, type);
  }
  default(value: "CURRENT_TIMESTAMP" | string | null | undefined): this {
    this._default = value;
    return this;
  }
  onUpdateCurrentTimeStamp(): this {
    this._onUpdateCurrentTimeStamp = true;
    return this;
  }
}

export class BooleanColumnBuilder extends ColumnBuilder {
  constructor(name: string) {
    super(name, SasatColumnTypes.boolean);
  }
  default(value: boolean | null) {
    this._default = value;
    return this;
  }
}

export class IdColumnBuilder extends ColumnBuilder {
  constructor(name: string) {
    super(name, SasatColumnTypes.id);
  }
  default(_: undefined) {
    return this;
  }
}
