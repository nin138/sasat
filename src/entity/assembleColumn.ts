import { SerializedColumn } from './serializedStore';
import { ReferenceColumn } from './referenceColumn';
import { TableHandler } from './table';
import { NormalColumn } from './column';

export const assembleColumn = (data: SerializedColumn, table: TableHandler) => {
  if (data.type === 'REFERENCE') {
    return new ReferenceColumn(data, table);
  }
  return new NormalColumn(data, table);
};
