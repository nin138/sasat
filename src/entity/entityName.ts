import { Identifier } from '../generator/ts/v2/code/node/Identifier';
import { creatableInterfaceName, identifiableInterfaceName } from '../constants/interfaceConstants';

export class EntityName {
  constructor(public readonly name: string) {}
  toString() {
    return this.name;
  }
  toIdentifier(): Identifier {
    return new Identifier(this.name);
  }
  creatableInterface(): string {
    return creatableInterfaceName(this.name);
  }
  identifiableInterfaceName(): string {
    return identifiableInterfaceName(this.name);
  }
}
