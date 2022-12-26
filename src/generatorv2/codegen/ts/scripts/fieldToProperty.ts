import { PropertySignature, tsg } from '../../../../tsg/index.js';
import { columnTypeToTsType } from '../../../../migration/column/columnTypes.js';
import { FieldNode } from '../../../nodes/entityNode.js';

export const fieldToPropertySignature = (
  field: FieldNode,
): PropertySignature => {
  return tsg.propertySignature(
    field.name,
    tsg.typeRef(columnTypeToTsType(field.dbType)),
    false,
    true,
  );
};
