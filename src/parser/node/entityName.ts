import {
  creatableInterfaceName,
  dbDataSourceName,
  generatedDBDataSourceName,
  identifiableInterfaceName,
} from '../../constants/interfaceConstants.js';
import { lowercaseFirstLetter } from '../../util/stringUtil.js';
import { Identifier } from '../../generator/ts/code/node/expressions.js';
import { TypeReference } from '../../generator/ts/code/node/type/typeReference.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { Directory } from '../../constants/directory.js';
import { tsg } from '../../generator/ts/code/factory.js';

export class EntityName {
  static fromTableName(tableName: string): EntityName {
    return new EntityName(TableHandler.tableNameToEntityName(tableName));
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
    return creatableInterfaceName(this.name);
  }
  creatableTypeReference(fromPath: string): TypeReference {
    return new TypeReference(this.creatableInterface()).importFrom(
      Directory.entityPath(fromPath, this.name),
    );
  }
  identifiableInterfaceName(): string {
    return identifiableInterfaceName(this.name);
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
    return dbDataSourceName(this.name);
  }
  generatedDataSourceName(): string {
    return generatedDBDataSourceName(this.name);
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
}
