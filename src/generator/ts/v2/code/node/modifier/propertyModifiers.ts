import { TsAccessor } from '../../../../tsClassGenerator';
import { Modifiers } from './modifiers';

export class PropertyModifiers extends Modifiers {
  accessor(accessor: TsAccessor): this {
    return super.accessor(accessor);
  }

  private(): this {
    return super.private();
  }

  protected(): this {
    return super.protected();
  }

  abstract(): this {
    return super.abstract();
  }

  readonly(): this {
    return super.readonly();
  }

  static(): this {
    return super.static();
  }
}
