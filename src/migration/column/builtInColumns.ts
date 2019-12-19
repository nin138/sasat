import { IntegerColumnBuilder, TimeStampColumnBuilder } from './columnBuilder';
import { DBColumnTypes } from './columnTypes';

export const builtInColumns = {
  autoIncrementPrimaryKey: (columnName: string) =>
    new IntegerColumnBuilder(columnName, DBColumnTypes.int)
      .autoIncrement()
      .unsigned()
      .autoIncrement()
      .primary(),
  createdAt: () => new TimeStampColumnBuilder('createdAt', DBColumnTypes.timestamp).defaultCurrentTimeStamp().notNull(),
  updatedAt: () =>
    new TimeStampColumnBuilder('updatedAt', DBColumnTypes.timestamp)
      .defaultCurrentTimeStamp()
      .onUpdateCurrentTimeStamp()
      .notNull(),
};
