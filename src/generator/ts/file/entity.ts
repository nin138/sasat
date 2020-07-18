import { IrEntity, IrEntityField } from '../../../ir/entity';
import { columnTypeToTsType } from '../../../migration/column/columnTypes';
import {
  creatableInterfaceName,
  identifiableInterfaceName,
} from '../../../constants/interfaceConstants';

const fieldToString = (field: IrEntityField, nullable: boolean) => {
  return `${field.fieldName}${nullable ? '?' : ''}: ${columnTypeToTsType(
    field.type,
  )};`;
};

const toInterface = (entityName: string, fields: string[]) => `\
export interface ${entityName} { ${fields.join('')}};
`;

const entityCreatableString = (entity: IrEntity): string => {
  const fields = entity.fields.map(it =>
    fieldToString(it, it.isNullableOnCreate),
  );
  return toInterface(creatableInterfaceName(entity.entityName), fields);
};

const primaryString = (entity: IrEntity): string => {
  const fields = entity.fields
    .filter(it => it.isPrimary)
    .map(it => fieldToString(it, false));
  return toInterface(identifiableInterfaceName(entity.entityName), fields);
};

const entityString = (entity: IrEntity): string => {
  const fields = entity.fields.map(it => fieldToString(it, it.nullable));
  return toInterface(entity.entityName, fields);
};

export const generateEntityFileString = (entity: IrEntity) => {
  return [
    entityCreatableString(entity),
    primaryString(entity),
    entityString(entity),
  ].join('\n');
};
