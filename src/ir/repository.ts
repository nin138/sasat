import { DBColumnTypes } from '../migration/column/columnTypes';

export interface IrRepository {
  tableName: string;
  entityName: string;
  primaryKeys: string[];
  queries: IrQuery[];
  useClasses: IrUseClasses[];
  autoIncrementColumn: string | undefined;
  defaultValues: Array<{ columnName: string; value: string | number | null }>;
  defaultCurrentTimestampColumns: string[];
}

export interface IrQuery {
  queryName: string;
  returnType: string;
  isReturnsArray: boolean;
  isReturnDefinitelyExist: boolean;
  params: IrQueryParam[];
}

export interface IrQueryParam {
  name: string;
  type: DBColumnTypes;
}

export interface IrUseClasses {
  path: string;
  classNames: string[];
}
