import { Modifiers } from './modifiers.js';

export class MethodModifiers extends Modifiers {
  private(): this {
    return super.private();
  }

  protected(): this {
    return super.protected();
  }

  abstract(): this {
    return super.abstract();
  }

  static(): this {
    return super.static();
  }

  async(): this {
    return super.async();
  }
}
