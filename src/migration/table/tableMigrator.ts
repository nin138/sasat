import { DataStoreMigrator } from '../dataStore';
import { ColumnBuilder } from '../column/columnBuilder';
import { addColumn, addForeignKey, addIndex, addPrimaryKey, addUniqueKey } from '../sqlCreater';
import { ColumnCreator } from '../column/columnCreator';
import { TableBase } from './tableBase';
import { TableBuilder } from './tableBuilder';
import { referenceToColumnInfo } from '../column/referenceColumn';
export class TableMigrator extends TableBase {
  static fromTableBuilder(store: DataStoreMigrator, table: TableBuilder): TableMigrator {
    const result: TableMigrator = Object.assign(Object.create(this.prototype), table, { store });
    if (result.primaryKey.length === 0)
      result.primaryKey = table.columns.filter(it => it.build().primary).map(it => it.name);
    return result;
  }

  constructor(protected store: DataStoreMigrator, tableName: string) {
    super(store, tableName);
  }

  addBuiltInColumn(column: ColumnBuilder, after?: string) {
    this.store.addMigrationQuery(addColumn(this.tableName, column.build()));
    this.applyAddColumn(column, after);
  }

  addColumn(name: string, createColumn: (c: ColumnCreator) => ColumnBuilder, after?: string): this {
    if (this.isColumnExists(name)) throw new Error(`${this.tableName}.${name} already exists`);
    const column = createColumn(new ColumnCreator(this, name, false));
    const afterStatement = after ? ` AFTER ${after}` : '';
    this.store.addMigrationQuery(addColumn(this.tableName, column.build()) + afterStatement);
    this.applyAddColumn(column, after);
    return this;
  }

  addReferences(table: string, column: string, unique = false): this {
    super.addReferences(table, column, unique);
    const columnInfo = referenceToColumnInfo(this.store, {
      targetTable: table,
      targetColumn: column,
      columnName: column,
      unique,
    });
    delete columnInfo.primary;
    this.store.addMigrationQuery(addColumn(this.tableName, columnInfo));
    this.store.addMigrationQuery(
      addForeignKey(this.tableName, {
        referenceTable: table,
        referenceColumn: column,
        columnName: column,
        constraintName: `ref${table}_${column}`,
      }),
    );
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
