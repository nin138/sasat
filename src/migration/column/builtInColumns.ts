import { IntegerColumnBuilder, TimeStampColumnBuilder } from './columnBuilder';
import { SasatColumnTypes } from './columnTypes';

export const builtInColumns = {
  autoIncrementPrimaryKey: (columnName: string) =>
    new IntegerColumnBuilder(columnName, SasatColumnTypes.int)
      .autoIncrement()
      .unsigned()
      .autoIncrement()
      .primary(),
  // eslint-disable-next-line @typescript-eslint/camelcase
  created_at: () =>
    new TimeStampColumnBuilder('created_at', SasatColumnTypes.timestamp).defaultCurrentTimeStamp().notNull(),
  // eslint-disable-next-line @typescript-eslint/camelcase
  updated_at: () =>
    new TimeStampColumnBuilder('updated_at', SasatColumnTypes.timestamp)
      .defaultCurrentTimeStamp()
      .onUpdateCurrentTimeStamp()
      .notNull(),
};
