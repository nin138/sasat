export type Fields = {
  fields: string[];
  relations?: Record<string, Fields | undefined>;
  tableAlias?: string;
};
