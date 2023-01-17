import {
  camelize,
  capitalizeFirstLetter,
  lowercaseFirstLetter,
} from '../../util/stringUtil.js';

export class EntityName {
  static fromTableName(tableName: string): EntityName {
    return new EntityName(capitalizeFirstLetter(camelize(tableName)));
  }
  constructor(public readonly name: string) {}
  toString(): string {
    return this.name;
  }
  creatableInterface(): string {
    return `${this.name}Creatable`;
  }
  updatable(): string {
    return `${this.name}Updatable`;
  }
  identifiableInterfaceName(): string {
    return `${this.name}Identifiable`;
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

  dataSourceName(): string {
    return `${this.name}DBDataSource`;
  }
  generatedDataSourceName(): string {
    return `Generated${this.name}DBDataSource`;
  }
  lowerCase(): string {
    return lowercaseFirstLetter(this.name);
  }
  createInputName(): string {
    return this.name + 'CreateInput';
  }
  updateInputName(): string {
    return this.name + 'UpdateInput';
  }
  identifyInputName(): string {
    return `${this.name}IdentifyInput`;
  }
  IDEncoderName(): string {
    return `${this.name}HashId`;
  }
}
