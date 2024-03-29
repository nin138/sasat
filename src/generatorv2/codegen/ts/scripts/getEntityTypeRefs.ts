import { EntityName } from '../../../nodes/entityName.js';
import { Directories, Directory } from '../../../directory.js';
import { tsg, TypeReference } from '../../../../tsg/index.js';

type TypeRefs =
  | 'creatable'
  | 'fields'
  | 'identifiable'
  | 'entity'
  | 'updatable'
  | 'result'
  | 'withRelation';
type TypeRefInfo = {
  name: (entity: EntityName) => string;
  file: (entity: EntityName) => string;
  dir: Directories;
};

const typeRefs: Record<TypeRefs, TypeRefInfo> = {
  entity: {
    name: entity => entity.name,
    dir: 'ENTITIES',
    file: entity => entity.name,
  },
  creatable: {
    name: entity => entity.creatableInterface(),
    dir: 'ENTITIES',
    file: entity => entity.name,
  },
  updatable: {
    name: entity => entity.updatable(),
    dir: 'ENTITIES',
    file: entity => entity.name,
  },
  identifiable: {
    name: entity => entity.identifiableInterfaceName(),
    dir: 'ENTITIES',
    file: entity => entity.name,
  },
  fields: {
    name: entity => entity.fieldsTypeName(),
    dir: 'GENERATED',
    file: () => 'fields',
  },
  withRelation: {
    name: entity => entity.entityWithRelationTypeName(),
    dir: 'GENERATED',
    file: () => 'relationMap',
  },
  result: {
    name: entity => entity.resultType(),
    dir: 'GENERATED',
    file: () => 'relationMap',
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

export const makeContextTypeRef = (importFrom: Directories): TypeReference => {
  return tsg
    .typeRef('GQLContext')
    .importFrom(Directory.resolve(importFrom, 'BASE', 'context'));
};
