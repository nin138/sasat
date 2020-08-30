import { SerializedColumn } from './serializedStore';
import { ReferenceColumn } from './referenceColumn';
import { TableHandler } from './table';
import { Column, NormalColumn } from './column';

export const assembleColumn = (data: SerializedColumn, table: TableHandler): Column => {
  if (data.type === 'REFERENCE') {
    return new ReferenceColumn(data, table);
  }
  return new NormalColumn(data, table);
};
