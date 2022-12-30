import {
  camelize,
  capitalizeFirstLetter,
  lowercaseFirstLetter,
} from '../../util/stringUtil.js';
import { TypeReference, Identifier } from '../../tsg/index.js';
import { Directory } from '../../constants/directory.js';
import { tsg } from '../../tsg/index.js';

export class EntityName {
  static fromTableName(tableName: string): EntityName {
    return new EntityName(capitalizeFirstLetter(camelize(tableName)));
  }
  constructor(public readonly name: string) {}
  toString(): string {
    return this.name;
  }
  toIdentifier(fromPath: string): Identifier {
    return new Identifier(this.name).importFrom(
      Directory.entityPath(fromPath, this.name),
    );
  }
  creatableInterface(): string {
    return `${this.name}Creatable`;
  }
  updatable(): string {
    return `${this.name}Updatable`;
  }
  creatableTypeReference(fromPath: string): TypeReference {
    return new TypeReference(this.creatableInterface()).importFrom(
      Directory.entityPath(fromPath, this.name),
    );
  }
  identifiableInterfaceName(): string {
    return `${this.name}Identifiable`;
  }
  identifiableTypeReference(fromPath: string): TypeReference {
    return new TypeReference(this.identifiableInterfaceName()).importFrom(
      Directory.entityPath(fromPath, this.name),
    );
  }

  relationTypeName(): string {
    return this.name + 'Relations';
  }
  entityWithRelationTypeName(): string {
    return this.name + 'WithRelations';
  }

  resultType(): string {
    return this.name + 'Result';
  }

  fieldsTypeName(): string {
    return this.name + 'Fields';
  }

  fieldTypeRef(fromPath: string): TypeReference {
    return new TypeReference(this.fieldsTypeName()).importFrom(
      Directory.generatedPath(fromPath, 'fields'),
    );
  }

  dataSourceName(): string {
    return `${this.name}DBDataSource`;
  }
  generatedDataSourceName(): string {
    return `Generated${this.name}DBDataSource`;
  }
  lowerCase(): string {
    return lowercaseFirstLetter(this.name);
  }
  getTypeReference(fromPath: string): TypeReference {
    return new TypeReference(this.name).importFrom(
      Directory.entityPath(fromPath, this.name),
    );
  }
  entityResultType(fromPath: string): TypeReference {
    return tsg
      .typeRef('EntityResult', [
        this.toIdentifier(fromPath),
        this.identifiableTypeReference(fromPath),
      ])
      .importFrom('sasat');
  }

  createInputName(): string {
    return this.name + 'CreateInput';
  }
  updateInputName(): string {
    return this.name + 'UpdateInput';
  }
}
