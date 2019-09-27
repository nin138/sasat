import { camelize } from '../../util';

export const toFunctionName = (keys: string[], prefix?: string) => {
  return camelize(prefix + '_' + keys.join('And_'));
};
