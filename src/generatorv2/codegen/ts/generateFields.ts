import { RootNode } from '../../nodes/rootNode.js';
import { TsFile, tsg } from '../../../tsg/index.js';
import { makeTypeRef } from './scripts/getEntityTypeRefs.js';
import { EntityNode } from '../../nodes/entityNode.js';
import { EntityName } from '../../nodes/entityName.js';

export const generateFields = (root: RootNode) => {
  return new TsFile(
    ...root.entities.map(it =>
      tsg
        .typeAlias(
          it.name.fieldsTypeName(),
          tsg
            .typeRef('Fields', [
              makeTypeRef(it.name, 'entity', 'GENERATED'),
              makeTypeLiteral(it),
            ])
            .importFrom('sasat'),
        )
        .export(),
    ),
  ).disableEsLint();
};

const makeTypeLiteral = (entity: EntityNode) => {
  return tsg.typeLiteral([
    ...entity.references.map(it =>
      tsg.propertySignature(
        `${it.fieldName}?`,
        tsg.typeRef(
          EntityName.fromTableName(it.parentTableName).fieldsTypeName(),
        ),
      ),
    ),
    ...entity.referencedBy.map(it =>
      tsg.propertySignature(
        `${it.fieldName}?`,
        tsg.typeRef(EntityName.fromTableName(it.childTable).fieldsTypeName()),
      ),
    ),
  ]);
};
