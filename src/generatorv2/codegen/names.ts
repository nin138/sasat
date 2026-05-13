import { capitalizeFirstLetter } from '../../util/stringUtil.js';
import type { EntityName } from '../nodes/entityName.js';
import type { MutationType } from '../nodes/mutationNode.js';

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

export const makeFindQueryName = (keys: string[]) =>
  'findBy' + keys.map(capitalizeFirstLetter).join('And');
