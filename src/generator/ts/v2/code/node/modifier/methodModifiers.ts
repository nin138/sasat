import { TsAccessor } from '../../../../tsClassGenerator';
import { Modifiers } from './modifiers';

export class MethodModifiers extends Modifiers {
  accessor(accessor: TsAccessor): this {
    return super.accessor(accessor);
  }

  abstract(): this {
    return super.abstract();
  }

  static(): this {
    return super.static();
  }
}
