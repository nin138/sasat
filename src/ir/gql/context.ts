import { DBColumnTypes } from '../../migration/column/columnTypes';

export interface IrGqlContext {
  name: string;
  type: DBColumnTypes;
}
