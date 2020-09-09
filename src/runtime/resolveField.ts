import { SQL, SQLJoin } from '../sql/condition';
import { QueryInfo, ResolveRoute } from './hydrate';
import { ComparisonOperators, Relation } from '..';

export type Field = {
  fields: string[];
  relations?: Record<string, Field | undefined>;
};

const formatField = (column: string, depth: number): [string, string] => [`t${depth}.${column}`, `${depth}__${column}`];
export type ResolveResult = {
  sql: Pick<SQL<any>, 'select' | 'join' | 'from'>; //{ select: string[][]; join: SQLJoin<any, any, any>[]; from: [string, string] };
  info: QueryInfo[];
};

type RelationMap = {
  [from: string]: {
    [to: string]: {
      table: string;
      on: [string, '=' | '>' | '<' | '>=' | '<=' | '<>', string][];
      relation: 'One' | 'OneOrZero' | 'Many';
    };
  };
};
type FieldResolver = (field: Field, from: string, depth?: number, currentRoute?: ResolveRoute) => ResolveResult;

export const createFieldResolver = (relationMap: RelationMap, keyMap: Record<string, string[]>): FieldResolver => {
  const resolveField: FieldResolver = (
    field: Field,
    from: string,
    depth = 0,
    currentRoute: ResolveRoute = [],
  ): ResolveResult => {
    const infoList: QueryInfo[] = [];
    const select: Array<[string, string]> = field.fields.map(it => formatField(it, depth));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const join: SQLJoin<unknown, any, any>[] = [];
    let currentDepth = depth;
    Object.entries(field.relations || []).forEach(([rel, field]: [string, Field | undefined]) => {
      if (field === undefined) return;
      const data = relationMap[from][rel];
      currentDepth += 1;
      const isArray = data.relation === Relation.Many;
      const routes = [...currentRoute, ...(isArray ? [rel, 0] : [rel])];
      infoList.push({
        parent: depth,
        target: currentDepth,
        property: rel,
        isArray,
        keys: keyMap[data.table],
        routes,
      });
      join.push({
        select: field.fields.map(it => formatField(it, currentDepth)) as [string, string][],
        table: [data.table, `t${currentDepth}`],
        on: data.on.map(on => [['t' + depth, on[0]], on[1] as ComparisonOperators, ['t' + currentDepth, on[2]]]),
      });

      const r = resolveField(field, data.table, currentDepth, routes);
      select.push(...(r.sql.select as [[string, string]]));
      join.push(...r.sql.join!);
      infoList.push(...r.info);
    });
    return {
      sql: {
        select,
        join,
        from: [from, 't0'],
      },
      info: infoList,
    };
  };

  return resolveField;
};
