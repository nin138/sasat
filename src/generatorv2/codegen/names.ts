import { EntityName } from '../../parser/node/entityName.js';
import { MutationType } from '../nodes/mutationNode.js';
import { capitalizeFirstLetter } from '../../util/stringUtil.js';

const map: Record<MutationType, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

export const publishFunctionName = (
  entityName: EntityName,
  type: MutationType,
) => {
  return `publish${entityName}${map[type]}`;
};

export const makePrimaryFindQueryName = (keys: string[]) =>
  'findBy' + keys.map(capitalizeFirstLetter).join('And');
