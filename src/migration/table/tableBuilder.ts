import { ColumnCreator } from "../column/columnCreator";
import { TableBase } from "./tableBase";

export class TableBuilder extends TableBase {
  constructor(tableName: string) {
    super(tableName);
  }

  column(name: string): ColumnCreator {
    if (this.isColumnExists(name)) throw new Error(`${this.tableName}.${name} already exists`);
    return new ColumnCreator(this, name);
  }
}
