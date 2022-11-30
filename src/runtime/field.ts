export type Fields<Entity, Relation = Record<string, unknown>> = {
  fields: Array<keyof Entity & string>;
  relations?: Relation;
  tableAlias?: string;
};
