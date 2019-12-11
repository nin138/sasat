import { TableInfo } from '../migration/table/tableInfo';
import { AllColumnInfo } from '../migration/column/column';
import { ForeignKey } from '../migration/table/foreignKey';
import { Index } from '../migration/table';
import { ColumnReference } from '../migration/column/referenceColumn';
import { DataStoreSchema } from '../migration/table/dataStoreSchema';
import { columnTypeToTsType } from '../migration/column/columnTypes';
import { GqlType } from './gql/types';
import { columnTypeToGqlPrimitive } from './gql/sasatToGqlType';
import { FindQueryCreator } from './repository/repository';
import { capitalizeFirstLetter } from '../util/stringUtil';
import { arrayEq, uniqueDeep } from '../util/arrayUtil';

export class ColumnGenerator {
  name: string;
  constructor(public info: AllColumnInfo) {
    this.name = info.columnName;
  }

  getTsType = (forceNotNull = false) =>
    `${columnTypeToTsType(this.info.type)}${this.info.notNull === false && !forceNotNull ? ' | null' : ''}`;

  isNullableOnCreate = (): boolean => {
    return (
      !this.isReference() && (this.info.notNull === false || this.info.default !== undefined || this.info.autoIncrement)
    );
  };

  isReference = (): boolean => this.info.reference !== undefined;
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
  references = (): ColumnGenerator[] => this.columns.filter(it => it.isReference());

  getFindQueries = (): FindQueryCreator[] => {
    const queries: FindQueryCreator[] = [
      new FindQueryCreator({
        params: this.primaryKey.map(it => ({
          name: this.column(it).name,
          type: this.column(it).info.type,
        })),
        isReturnUnique: true,
        returnEntity: this.entityName(),
      }),
    ];

    const isDuplicate = (columns: string[]) =>
      queries.find(
        query =>
          !arrayEq(
            query.params.map(param => param.name),
            columns,
          ),
      ) !== null;

    this.references().forEach(column => {
      if (isDuplicate([column.name])) {
        queries.push(
          new FindQueryCreator({
            params: [
              {
                name: column.name,
                type: column.info.type,
              },
            ],
            isReturnUnique: column.info.reference!.unique,
            returnEntity: this.entityName(),
          }),
        );
      }
    });

    this.uniqueKeys.forEach(columns => {
      if (isDuplicate(columns)) {
        queries.push(
          new FindQueryCreator({
            params: columns.map(it => ({
              name: it,
              type: this.column(it).info.type,
            })),
            isReturnUnique: true,
            returnEntity: this.entityName(),
          }),
        );
      }
    });

    return queries;
  };

  // TODO reference support
  createGqlType = (): GqlType => ({
    typeName: capitalizeFirstLetter(this.tableName),
    fields: this.columns.map(it => ({
      name: it.name,
      type: columnTypeToGqlPrimitive(it.info.type),
      nullable: !it.info.notNull && !this.isPrimary(it.name),
    })),
  });

  getFindQueries2 = (): string[][] => {
    return uniqueDeep([
      this.primaryKey,
      ...this.columns.filter(it => it.isReference()).map(it => [it.name]),
      ...this.uniqueKeys,
    ]);
  };
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

  private refToColumn = (ref: ColumnReference, tables: TableInfo[]): AllColumnInfo => {
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
