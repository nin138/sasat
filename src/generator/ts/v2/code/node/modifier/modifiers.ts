import { TsCode } from '../../abstruct/tsCode';
import { TsAccessor } from '../../../../tsClassGenerator';

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
    return this.accessor(TsAccessor.private);
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
    return this._accessor + this.isAbstract
      ? 'abstract '
      : '' + this.isStatic
      ? 'static '
      : '' + this.isReadOnly
      ? 'readonly '
      : '' + this.isAsync
      ? 'async '
      : '';
  }
}
