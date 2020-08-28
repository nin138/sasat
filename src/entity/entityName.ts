import { Identifier } from '../generator/ts/v2/code/node/Identifier';
import {
  creatableInterfaceName,
  dataSourceName,
  generatedDataSourceName,
  identifiableInterfaceName,
} from '../constants/interfaceConstants';
import { lowercaseFirstLetter } from '../util/stringUtil';
import { TypeReference } from '../generator/ts/v2/code/node/type/typeReference';
import { getEntityPath } from '../constants/directory';

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
  dataSourceName(): string {
    return dataSourceName(this.name);
  }
  generatedDataSourceName(): string {
    return generatedDataSourceName(this.name);
  }
  lowerCase(): string {
    return lowercaseFirstLetter(this.name);
  }
  getTypeReference(fromPath: string): TypeReference {
    return new TypeReference(this.name).importFrom(getEntityPath(fromPath, this.name));
  }
}
