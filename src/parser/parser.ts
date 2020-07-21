import { Ir } from '../ir/ir';
import { DataStoreHandler } from '../entity/dataStore';
import { IrEntity } from '../ir/entity';
import { TableHandler } from '../entity/table';
import { capitalizeFirstLetter } from '../util/stringUtil';
import { IrQuery, IrRepository } from '../ir/repository';
import { ReferenceColumn } from '../entity/referenceColumn';
import { NormalColumn } from '../entity/column';
import { DBColumnTypes } from '../migration/column/columnTypes';
import { Relation } from '..';
import {
  creatableInterfaceName,
  identifiableInterfaceName,
} from '../constants/interfaceConstants';
import { CodeGeneratable } from '../generatable/codeGeneratable';
import { RepositoryNode } from '../generatable/repository';
import { EntityNode } from '../generatable/entity';
import { FieldNode } from '../generatable/field';

export class Parser {
  constructor(private store: DataStoreHandler) {}
  parse(): CodeGeneratable {
    return {
      repositories: this.store.tables.map(
        it => new RepositoryNode(this.createRepository(it)),
      ),
      entities: this.store.tables.map(it => {
        const e = this.createEntity(it);
        return new EntityNode(
          e.entityName,
          e.fields.map(it => new FieldNode(it)),
        );
      }),
    };
  }

  private createEntity(table: TableHandler): IrEntity {
    const fields = table.columns.map(column => {
      const data = column.getData();
      return {
        fieldName: data.columnName,
        isPrimary: table.isColumnPrimary(column.name),
        type: data.type,
        nullable: !data.notNull,
        default: data.default,
        isNullableOnCreate:
          data.default !== undefined || !data.notNull || data.autoIncrement,
      };
    });
    return {
      entityName: table.getEntityName(),
      fields,
    };
  }

  static paramsToQueryName(...params: string[]) {
    return 'findBy' + params.map(capitalizeFirstLetter).join('And');
  }

  private createPrimaryQuery(table: TableHandler): IrQuery {
    return {
      queryName: Parser.paramsToQueryName(...table.primaryKey),
      returnType: table.getEntityName(),
      isReturnsArray: false,
      isReturnDefinitelyExist: false,
      params: table.primaryKey.map(it => ({
        name: it,
        type: table.column(it)!.type,
      })),
    };
  }

  private createRefQuery(ref: ReferenceColumn): IrQuery {
    return {
      queryName: Parser.paramsToQueryName(
        ref.getTargetColumn().getData().columnName,
      ),
      returnType: ref.table.getEntityName(),
      isReturnsArray: ref.data.relation === Relation.Many,
      isReturnDefinitelyExist: false, // TODO RELATION
      params: [
        { name: ref.getTargetColumn().getData().columnName, type: ref.type },
      ],
    };
  }

  private getQueries(table: TableHandler): IrQuery[] {
    const queries: IrQuery[] = [];
    if (
      table.primaryKey.length > 1 ||
      !table.column(table.primaryKey[0])!.isReference()
    ) {
      queries.push(this.createPrimaryQuery(table));
    }
    queries.push(
      ...table.columns
        .filter(column => column.isReference())
        .map(it => this.createRefQuery(it as ReferenceColumn)),
    );
    return queries;
  }

  private createRepository(table: TableHandler): IrRepository {
    const entityName = table.getEntityName();
    const queries = this.getQueries(table);
    const defaultValues: Array<{
      columnName: string;
      value: string | number | null;
    }> = [];
    const defaultCurrentTimestampColumns: string[] = [];
    table.columns
      .filter(it => !it.isReference())
      .filter(
        it =>
          (it as NormalColumn).data.default ||
          !(it as NormalColumn).data.notNull,
      )
      .forEach(it => {
        const column: NormalColumn = it as NormalColumn;
        if (
          (column.type === DBColumnTypes.timestamp ||
            column.type === DBColumnTypes.dateTime) &&
          column.data.default === 'CURRENT_TIMESTAMP'
        ) {
          defaultCurrentTimestampColumns.push(column.name);
          return;
        }
        defaultValues.push({
          columnName: column.name,
          value:
            column.data.default === undefined
              ? null
              : (column.data.default as string),
        });
      });
    return {
      tableName: table.tableName,
      entityName,
      primaryKeys: table.primaryKey,
      autoIncrementColumn: table.columns.find(
        it => !it.isReference() && it.getData().autoIncrement,
      )?.name,
      defaultValues,
      defaultCurrentTimestampColumns,
      onUpdateCurrentTimestampColumns: table.columns
        .filter(it => it.getData().onUpdateCurrentTimeStamp)
        .map(it => it.name),
      queries,
      useClasses: [
        {
          path: `entity/${table.tableName}`,
          classNames: [
            entityName,
            creatableInterfaceName(entityName),
            identifiableInterfaceName(entityName),
          ],
        },
      ],
      subscription: table.gqlOption.subscription,
    };
  }
}
