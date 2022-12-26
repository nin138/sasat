import { EntityName } from '../../parser/node/entityName.js';
import { MutationType } from '../nodes/mutationNode.js';
import { capitalizeFirstLetter } from '../../../lib/util/stringUtil.js';

export const publishFunctionName = (
  entityName: EntityName,
  type: MutationType,
) => {
  return `publish${entityName}${type}`;
};

export const makePrimaryFindQueryName = (keys: string[]) =>
  'findBy' + keys.map(capitalizeFirstLetter).join('And');
