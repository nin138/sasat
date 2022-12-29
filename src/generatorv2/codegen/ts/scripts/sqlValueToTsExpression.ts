import { TsExpression, tsg } from '../../../../tsg/index.js';
import { SqlValueType } from '../../../../db/connectors/dbClient.js';

export const sqlValueToTsExpression = (value: SqlValueType): TsExpression => {
  if (typeof value === 'string') {
    return tsg.string(value);
  }
  if (typeof value === 'number') {
    return tsg.number(value);
  }
  return tsg.identifier('null');
};
