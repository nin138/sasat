import {
  creatableInterfaceName,
  dataSourceName,
  generatedDataSourceName,
  identifiableInterfaceName,
} from '../constants/interfaceConstants';
import { lowercaseFirstLetter } from '../util/stringUtil';
import { TypeReference } from '../generator/ts/v2/code/node/type/typeReference';
import { Directory } from '../constants/directory';
import { Identifier } from '../generator/ts/v2/code/node/expressions';

export class EntityName {
  constructor(public readonly name: string) {}
  toString() {
    return this.name;
  }
  toIdentifier(fromPath: string): Identifier {
    return new Identifier(this.name).importFrom(fromPath);
  }
  creatableInterface(): string {
    return creatableInterfaceName(this.name);
  }
  creatableTypeReference(fromPath: string): TypeReference {
    return new TypeReference(this.creatableInterface()).importFrom(Directory.entityPath(fromPath, this.name));
  }
  identifiableInterfaceName(): string {
    return identifiableInterfaceName(this.name);
  }
  identifiableTypeReference(fromPath: string): TypeReference {
    return new TypeReference(this.identifiableInterfaceName()).importFrom(Directory.entityPath(fromPath, this.name));
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
    return new TypeReference(this.name).importFrom(Directory.entityPath(fromPath, this.name));
  }
}
