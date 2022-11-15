// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = { [key: string]: any };

export const assignDeep = (base: Obj, ...objects: Obj[]): Obj => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assign = (target: Obj, key: string, value: any) => {
    if (key === '__proto__' || key === 'constructor') {
      return;
    }
    if (Array.isArray(target[key]) && Array.isArray(value)) {
      target[key] = [...target[key], ...value];
    } else if (typeof target[key] === 'object' && typeof value === 'object') {
      assignDeep(target[key], value);
    } else {
      target[key] = value;
    }
  };

  objects.forEach(obj => {
    if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        assign(base, key, value);
      });
    }
  });
  return base;
};
