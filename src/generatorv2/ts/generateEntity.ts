import { tsg } from '../../generator/ts/code/factory.js';
import { fieldToPropertySignature } from './scripts/fieldToProperty.js';
import { EntityNode } from '../nodes/entityNode.js';
import { TsFile } from '../../generator/ts/file.js';

export const generateEntityFile = (node: EntityNode): string => {
  return new TsFile(
    generateEntity(node),
    generateCreatable(node),
    generateIdentifiable(node),
  )
    .disableEsLint()
    .toString();
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
