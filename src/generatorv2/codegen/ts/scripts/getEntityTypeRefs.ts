import { EntityName } from '../../../../parser/node/entityName.js';
import { Directories, Directory } from '../../../directory.js';
import { tsg, TypeReference } from '../../../../tsg/index.js';

export const getFieldTypeRef = (
  entity: EntityName,
  importFrom: Directories,
) => {
  return tsg
    .typeRef(entity.fieldsTypeName())
    .importFrom(Directory.resolve(importFrom, 'GENERATED', 'field.ts'));
};

type TypeRefs = 'creatable' | 'fields' | 'identifiable' | 'entity';
type TypeRefInfo = {
  name: (entity: EntityName) => string;
  file: (entity: EntityName) => string;
  dir: Directories;
};

const typeRefs: Record<TypeRefs, TypeRefInfo> = {
  entity: {
    name: entity => entity.name,
    dir: 'ENTITIES',
    file: entity => entity.name + '.ts',
  },
  creatable: {
    name: entity => entity.creatableInterface(),
    dir: 'ENTITIES',
    file: entity => entity.name + '.ts',
  },
  identifiable: {
    name: entity => entity.identifiableInterfaceName(),
    dir: 'ENTITIES',
    file: entity => entity.name + '.ts',
  },
  fields: {
    name: entity => entity.fieldsTypeName(),
    dir: 'GENERATED',
    file: () => 'field.ts',
  },
};

export const makeTypeRef = (
  entity: EntityName,
  type: TypeRefs,
  importFrom: Directories,
): TypeReference => {
  const info = typeRefs[type];
  return tsg
    .typeRef(info.name(entity))
    .importFrom(Directory.resolve(importFrom, info.dir, info.file(entity)));
};
