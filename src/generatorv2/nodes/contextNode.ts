import { DBColumnTypes } from '../../migration/column/columnTypes.js';

export type ContextNode = {
  name: string;
  dbtype: DBColumnTypes;
};
