import { DBColumnTypes } from '../../migration/column/columnTypes';
import { SqlValueType } from '../../db/dbClient';

export interface IrEntity {
  entityName: string;
  fields: IrEntityField[];
}

export interface IrEntityField {
  fieldName: string;
  isPrimary: boolean;
  type: DBColumnTypes;
  nullable: boolean;
  default: SqlValueType | undefined;
  isNullableOnCreate: boolean;
}
