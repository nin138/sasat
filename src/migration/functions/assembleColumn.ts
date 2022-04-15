import { SerializedColumn } from '../serialized/serializedColumn.js';
import { TableHandler } from '../serializable/table.js';
import { BaseColumn, NormalColumn, ReferenceColumn } from '../serializable/column.js';

export const assembleColumn = (data: SerializedColumn, table: TableHandler): BaseColumn => {
  if (data.hasReference) {
    return new ReferenceColumn(data, table);
  }
  return new NormalColumn(data, table);
};
