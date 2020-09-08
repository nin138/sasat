export type ResolveRoute = (string | number)[];
export type QueryInfo = {
  parent: number;
  target: number;
  property: string;
  isArray: boolean;
  keys: string[];
  routes: ResolveRoute;
};

const access = (target: Record<string, unknown>, route: ResolveRoute) => {
  // @ts-ignore
  let result: any = target;
  for (let i = 0; i < route.length; i++) {
    if (i === route.length - 1 && route[i] === 0) break;
    result = result[route[i]];
  }
  return result;
};

const getUnique = (target: Record<string, string | number | null>, table: number, keys: string[]) =>
  keys.map(it => target[table + '__' + it]).join('_~_');

const rowToObjs = (row: Record<string, unknown>) => {
  const objs: Record<string, Record<string, unknown>> = {};
  Object.entries(row).forEach(([key, value]) => {
    const [table, column] = key.split('__');
    if (!objs[table]) {
      objs[table] = {};
    }
    objs[table][column] = value;
  });
  return objs;
};

const hydrateRow = (row: Record<string, unknown>, infoList: QueryInfo[], startRoute = 0) => {
  const objs: Record<string, Record<string, unknown>> = rowToObjs(row);
  const startIndex = infoList.slice(1, startRoute + 1).reduce((c, p) => c + p.routes.length, 0);
  const result: Record<string, any> = objs[startRoute];
  const assign = (table: number, value: unknown) => {
    const currentRoute = infoList[table].routes;
    let ref = result;
    for (let i = startIndex; i < currentRoute.length - 1; i++) {
      if (currentRoute[i + 1] === 0 && ref[currentRoute[i]] === undefined) {
        ref[currentRoute[i]] = [];
      }
      ref = ref[currentRoute[i]];
    }
    const key = currentRoute[currentRoute.length - 1];
    ref[key] = value;
  };
  infoList.slice(startRoute + 1).forEach(info => {
    assign(info.target, objs[info.target]);
  });
  return result;
};

// @ts-ignore
export const hydrate = (data: Record<string, any>[], infoList: QueryInfo[]): any[] => {
  const result: Record<string, unknown>[] = [];
  const t0mapper: Record<string, number> = {};

  data.forEach(row => {
    const info = infoList[0];
    const unique = getUnique(row, 0, info.keys);
    if (t0mapper[unique] === undefined) {
      t0mapper[unique] = result.length;
      result.push(hydrateRow(row, infoList));
      return;
    }
    const base = result[t0mapper[unique]];
    let index = 0;
    while (index < infoList.length - 1) {
      index += 1;
      const info = infoList[index];
      const route = info.routes;
      const target = access(base, route);
      if (Array.isArray(target)) {
        const r = target.findIndex(it => info.keys.every(key => it[key] === row[index + '__' + key]));
        if (r === -1) {
          target.push(hydrateRow(row, infoList, index));
          return;
        } else {
          continue;
        }
      } else {
        target[info.property] = hydrateRow(row, infoList, index);
        return;
      }
    }
  });

  return result;
};
