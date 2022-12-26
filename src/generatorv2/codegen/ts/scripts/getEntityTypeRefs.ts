import { EntityName } from '../../../../parser/node/entityName.js';
import { Directories, Directory } from '../../../directory.js';
import { tsg } from '../../../../tsg/index.js';

export const getFieldTypeRef = (
  entity: EntityName,
  importFrom: Directories,
) => {
  return tsg
    .typeRef(entity.fieldsTypeName())
    .importFrom(Directory.resolve(importFrom, 'GENERATED', 'field.ts'));
};
