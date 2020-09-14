import { Column, NormalColumn, ReferenceColumn } from '../migration/serializable/column';
import { SerializedColumn } from '../migration/serialized/serializedColumn';
import { TableHandler } from '../migration/serializable/table';

export const assembleColumn = (data: SerializedColumn, table: TableHandler): Column => {
  if (data.hasReference) {
    return new ReferenceColumn(data, table);
  }
  return new NormalColumn(data, table);
};
