export const pick = <T extends object>(target: T, keys: Array<keyof T>) =>
  Object.fromEntries(keys.map(key => [key, target[key]]));

export const unique = <T>(array: T[]): T[] => {
  const result: T[] = [];
  for (let i = 0, l = array.length; i < l; i += 1) {
    if (!result.includes(array[i])) {
      result.push(array[i]);
    }
  }
  return result;
};

export const nonNullable = <T>(value: T): value is NonNullable<T> =>
  value != null;
