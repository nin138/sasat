import {
  KeywordTypeNode,
  PropertySignature,
  tsg,
} from '../../../../tsg/index.js';
import { columnTypeToTsType } from '../../../../migration/column/columnTypes.js';
import { FieldNode } from '../../../nodes/entityNode.js';

export const fieldToPropertySignature = (
  field: FieldNode,
): PropertySignature => {
  const type = tsg.typeRef(columnTypeToTsType(field.dbType));
  return tsg.propertySignature(
    field.fieldName,
    field.isNullable ? tsg.unionType(type, KeywordTypeNode.null) : type,
    false,
    true,
  );
};
