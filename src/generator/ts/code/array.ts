import { tsValueString } from './value';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tsArrayString = (arr: any[]): string => `[${arr.map(tsValueString).join(', ')}]`;
