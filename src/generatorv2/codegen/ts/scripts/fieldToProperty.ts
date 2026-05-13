import { columnTypeToTsType } from "../../../../migration/column/columnTypes.js";
import {
  KeywordTypeNode,
  type PropertySignature,
  tsg,
} from "../../../../tsg/index.js";
import type { FieldNode } from "../../../nodes/FieldNode.js";

export const fieldToPropertySignature = (
  field: FieldNode,
): PropertySignature => {
  const type = tsg.typeRef(columnTypeToTsType(field.dbType));
  return tsg.propertySignature(
    field.fieldName,
    field.isNullable ? tsg.unionType(type, KeywordTypeNode.null) : type,
    field.isNullable,
    true,
  );
};
