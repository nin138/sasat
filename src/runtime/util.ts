export const pick = <T extends object, K extends keyof T>(
  target: T,
  keys: K[],
): Partial<T> => Object.fromEntries(keys.map((key) => [key, target[key]])) as unknown as Partial<T>;
