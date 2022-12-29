import { tsg, TsFile } from '../../../tsg/index.js';
import { fieldToPropertySignature } from './scripts/fieldToProperty.js';
import { EntityNode } from '../../nodes/entityNode.js';

export const generateEntityFile = (node: EntityNode): TsFile => {
  return new TsFile(
    generateEntity(node),
    generateCreatable(node),
    generateUpdatable(node),
    generateIdentifiable(node),
  ).disableEsLint();
};

const generateEntity = (node: EntityNode) => {
  return tsg
    .typeAlias(
      node.name.name,
      tsg.typeLiteral(node.fields.map(fieldToPropertySignature)),
    )
    .export();
};

const generateCreatable = (node: EntityNode) => {
  return tsg
    .typeAlias(
      node.name.creatableInterface(),
      node.creatable.fields.length === 0
        ? tsg.typeRef('Record<string, never>')
        : tsg.typeLiteral(node.creatable.fields.map(fieldToPropertySignature)),
    )
    .export();
};

const generateUpdatable = (node: EntityNode) => {
  return tsg.typeAlias(
    node.name.updatable(),
    node.updateInput.fields.length === 0
      ? tsg.typeRef('Record<string, never>')
      : tsg.typeLiteral(node.updateInput.fields.map(fieldToPropertySignature)),
  );
};

const generateIdentifiable = (node: EntityNode) => {
  return tsg
    .typeAlias(
      node.name.identifiableInterfaceName(),
      tsg.typeLiteral(
        node.fields.filter(it => it.isPrimary).map(fieldToPropertySignature),
      ),
    )
    .export();
};
