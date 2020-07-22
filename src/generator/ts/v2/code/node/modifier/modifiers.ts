import { TsCode } from '../../abstruct/tsCode';
import { TsAccessor } from '../../../../tsClassGenerator';

export class Modifiers extends TsCode {
  private _accessor: TsAccessor = TsAccessor.public;
  private isReadOnly = false;
  private isStatic = false;
  private isAbstract = false;

  protected accessor(accessor: TsAccessor): this {
    this._accessor = accessor;
    return this;
  }

  abstract(): this {
    this.isAbstract = true;
    return this;
  }

  readonly(): this {
    this.isReadOnly = true;
    return this;
  }

  static(): this {
    this.isStatic = true;
    return this;
  }

  protected toTsString(): string {
    return this._accessor + this.isAbstract
      ? 'abstract '
      : '' + this.isStatic
      ? 'static '
      : '' + this.isReadOnly
      ? 'readonly '
      : '';
  }
}
