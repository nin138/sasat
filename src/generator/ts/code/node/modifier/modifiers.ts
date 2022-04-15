import { TsCode } from '../../abstruct/tsCode.js';
import { TsAccessor } from '../../accessors.js';

export class Modifiers extends TsCode {
  private _accessor: TsAccessor = TsAccessor.public;
  private isReadOnly = false;
  private isStatic = false;
  private isAbstract = false;
  private isAsync = false;

  protected accessor(accessor: TsAccessor): this {
    this._accessor = accessor;
    return this;
  }

  protected private(): this {
    return this.accessor(TsAccessor.private);
  }

  protected protected(): this {
    return this.accessor(TsAccessor.protected);
  }

  protected abstract(): this {
    this.isAbstract = true;
    return this;
  }

  protected readonly(): this {
    this.isReadOnly = true;
    return this;
  }

  protected static(): this {
    this.isStatic = true;
    return this;
  }

  protected async(): this {
    this.isAsync = true;
    return this;
  }

  protected toTsString(): string {
    const optional = (bool: boolean, string: string) => (bool ? string : '');
    return (
      this._accessor +
      ' ' +
      optional(this.isAbstract, 'abstract ') +
      optional(this.isStatic, 'static ') +
      optional(this.isReadOnly, 'readonly ') +
      optional(this.isAsync, 'async ')
    );
  }
}
