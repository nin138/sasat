import { DataStoreMigrator } from "../dataStore";
import { ColumnBuilder } from "../column/columnBuilder";
import { addColumn, addIndex, addPrimaryKey, addUniqueKey } from "../sqlCreater";
import { ColumnCreator } from "../column/columnCreator";
import { TableBase } from "./tableBase";
import { TableBuilder } from "./tableBuilder";
export class TableMigrator extends TableBase {
  static fromTableBuilder(store: DataStoreMigrator, table: TableBuilder): TableMigrator {
    return Object.assign(Object.create(this.prototype), table, { store });
  }

  constructor(private store: DataStoreMigrator, tableName: string) {
    super(tableName);
  }

  addBuiltInColumn(column: ColumnBuilder, after?: string) {
    this.store.addMigrationQuery(addColumn(this.tableName, column.build()));
    this.applyAddColumn(column, after);
  }

  addColumn(name: string, createColumn: (c: ColumnCreator) => ColumnBuilder, after?: string): this {
    if (this.isColumnExists(name)) throw new Error(`${this.tableName}.${name} already exists`);
    const column = createColumn(new ColumnCreator(this, name, false));
    const afterStatement = after ? ` AFTER ${after}` : "";
    this.store.addMigrationQuery(addColumn(this.tableName, column.build()) + afterStatement);
    this.applyAddColumn(column, after);
    return this;
  }

  addUniqueKey(...columns: string[]): this {
    super.addUniqueKey(...columns);
    this.store.addMigrationQuery(addUniqueKey(this.tableName, columns));
    return this;
  }

  addPrimaryKey(...columns: string[]): this {
    super.addPrimaryKey(...columns);
    this.store.addMigrationQuery(addPrimaryKey(this.tableName, columns));
    return this;
  }

  addIndex(constraintName: string, ...columns: string[]) {
    super.addIndex(constraintName, ...columns);
    this.store.addMigrationQuery(addIndex(this.tableName, { constraintName, columns }));
    return this;
  }

  private applyAddColumn(column: ColumnBuilder, after?: string) {
    if (!after) this.columns.push(column);
    else this.columns.splice(this.columns.findIndex(it => it.name === after), 0, column);
  }
}
