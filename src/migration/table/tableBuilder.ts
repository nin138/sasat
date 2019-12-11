import { ColumnCreator } from '../column/columnCreator';
import { TableBase } from './tableBase';
import { DataStore } from '../dataStore';

export class TableBuilder extends TableBase {
  constructor(protected store: DataStore, readonly tableName: string) {
    super(store, tableName);
  }

  column(name: string): ColumnCreator {
    if (this.isColumnExists(name)) throw new Error(`${this.tableName}.${name} already exists`);
    return new ColumnCreator(this, name);
  }
}
