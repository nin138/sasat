// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const arrayEq = (arr1: any[], arr2: any[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
};

export const uniqueDeep = <T>(arr: T[]): T[] =>
  [...new Set(arr.map(it => JSON.stringify(it)))].map(it => JSON.parse(it));

export const unique = <T>(arr: T[]): T[] => [...new Set(arr)];
