import { TableBuilder } from '../../migration/table/tableBuilder';
import { TableMigrator } from '../../migration/table/tableMigrator';
import { SasatError } from '../../error';
import { addIndex } from '../../migration/sqlCreater';
import { DataStoreSchema } from '../../migration/table/dataStoreSchema';

export interface MigrationStore {
  createTable(tableName: string, tableCreator: (table: TableBuilder) => void): MigrationStore;
  dropTable(tableName: string): MigrationStore;
}

export class StoreMigrator implements MigrationStore {
  protected tables: TableMigrator[] = [];
  protected migrationQueue: string[] = [];

  table(tableName: string): TableMigrator | undefined {
    return this.tables.find(it => it.tableName === tableName);
  }

  protected addQuery(...query: string[]) {
    this.migrationQueue.push(...query);
  }

  createTable(tableName: string, tableCreator: (table: TableBuilder) => void): MigrationStore {
    if (this.table(tableName)) throw new SasatError(`${tableName} is already exist`);
    const tmp = new TableBuilder(this, tableName);
    tableCreator(tmp);
    const table = TableMigrator.fromTableBuilder(this, tmp);
    this.tables.push(table);
    this.addQuery(table.showCreateTable());
    this.addQuery(...table.indexes.map(it => addIndex(table.tableName, it)));
    return this;
  }

  dropTable(tableName: string) {
    this.migrationQueue.push(`DROP TABLE ${tableName}`);
    return this;
  }

  getSql() {
    return this.migrationQueue;
  }

  reset() {
    this.migrationQueue = [];
  }

  serialize(): DataStoreSchema {
    return {
      tables: this.tables.map(it => it.serialize()),
    };
  }
}
