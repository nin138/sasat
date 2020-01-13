import { SasatError } from '../../../error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tsValueString = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') return '' + value;
  if (typeof value === 'boolean') return '' + value;
  if (typeof value === 'string') return `'${value}'`;
  if (typeof value === 'bigint') return '' + value;
  if (typeof value === 'function') return value.toString();
  if (Array.isArray(value)) return `[${value.map(tsValueString).join(',')}]`;
  if (typeof value === 'object') {
    const keyValues = Object.entries(value)
      .map(([key, value]) => [key, tsValueString(value)])
      .map(([key, value]) => `${key}: ${value}`)
      .join(',');
    return `{${keyValues}}`;
  }
  throw new SasatError(`tsValueString::unsupported data type ${typeof value}`);
};
