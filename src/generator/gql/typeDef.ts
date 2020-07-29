import { IrGqlParam } from '../../ir/gql/types';
import { GqlPrimitive } from './types';

export const getGqlTypeString = (param: {
  type: string | GqlPrimitive;
  isNullable: boolean;
  isArray: boolean;
  isArrayNullable?: boolean;
}) => {
  let type = param.type;
  if (!param.isNullable) type = type + '!';
  if (param.isArray) type = `[${type}]${param.isArrayNullable ? '' : '!'}`;
  return type;
};

export const createParamString = (params: IrGqlParam[]) => {
  return params.length === 0 ? '' : `(${params.map(it => `${it.name}: ${getGqlTypeString(it)}`).join(', ')})`;
};
