export const pick = <T extends object>(
  target: T,
  keys: Array<keyof T>,
) => Object.fromEntries(keys.map((key) => [key, target[key]]));


