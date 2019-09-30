import { TableInfo } from '../migration/table/tableInfo';
import { AllColumnInfo } from '../migration/column/column';
import { ForeignKey } from '../migration/table/foreignKey';
import { Index } from '../migration/table';
import { ReferenceColumnInfo } from '../migration/column/referenceColumn';
import { DataStoreSchema } from '../migration/table/dataStoreSchema';
import { capitalizeFirstLetter } from '../util';
import { columnTypeToTsType } from '../migration/column/columnTypes';

export class ColumnGenerator {
  name: string;
  constructor(public info: AllColumnInfo) {
    this.name = info.columnName;
  }

  getTsType = (forceNotNull = false) =>
    `${columnTypeToTsType(this.info.type)}${this.info.notNull === false && !forceNotNull ? ' | null' : ''}`;

  isNullableOnCreate = (): boolean => {
    return this.info.notNull === false || this.info.default !== undefined || this.info.autoIncrement;
  };
}

export class TableGenerator implements Omit<TableInfo, 'columns' | 'references'> {
  columns: Array<ColumnGenerator>;
  foreignKeys: ForeignKey[];
  indexes: Index[];
  primaryKey: string[];
  tableName: string;
  uniqueKeys: string[][];

  constructor(info: Omit<TableInfo, 'references'>) {
    this.columns = info.columns.map(it => new ColumnGenerator(it));
    this.foreignKeys = info.foreignKeys;
    this.indexes = info.indexes;
    this.primaryKey = info.primaryKey;
    this.tableName = info.tableName;
    this.uniqueKeys = info.uniqueKeys;
  }
  column = (columnName: string): ColumnGenerator => this.columns.find(it => it.name === columnName)!;
  entityName = () => capitalizeFirstLetter(this.tableName);
  isPrimary = (columnName: string) => this.primaryKey.includes(columnName);
}

export class StoreGenerator {
  tables: TableGenerator[];

  constructor(private schema: DataStoreSchema) {
    this.tables = schema.tables.map(table => {
      table.references.forEach(ref => (table.columns = table.columns.concat(this.refToColumn(ref, schema.tables))));
      delete table.references;
      return new TableGenerator(table);
    });
  }

  private refToColumn = (ref: ReferenceColumnInfo, tables: TableInfo[]): AllColumnInfo => {
    const target = tables
      .find(it => it.tableName === ref.targetTable)!
      .columns.find(it => it.columnName === ref.targetColumn)!;
    return {
      ...target,
      reference: ref,
      autoIncrement: false,
    };
  };
  table = (tableName: string): TableGenerator => this.tables.find(it => it.tableName === tableName)!;
}
