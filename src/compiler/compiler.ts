import { Ir } from '../ir/ir';
import { DataStoreHandler } from '../entity/dataStore';
import { SerializedStore } from '../entity/serializedStore';
import { IrEntity } from '../ir/entity';
import { TableHandler } from '../entity/table';
import { capitalizeFirstLetter } from '../util/stringUtil';
import { IrQuery, IrRepository } from '../ir/repository';
import { ReferenceColumn } from '../entity/referenceColumn';

export class Compiler {
  store: DataStoreHandler;
  constructor(data: SerializedStore) {
    this.store = new DataStoreHandler(data);
  }
  compile(): Ir {
    return {
      repositories: this.store.tables.map(it => this.createRepository(it)),
      entities: this.store.tables.map(it => this.createEntity(it)),
    };
  }

  private createEntity(table: TableHandler): IrEntity {
    const fields = table.columns.map(column => {
      const data = column.getData();
      return {
        fieldName: column.name,
        isPrimary: table.isColumnPrimary(column.name),
        type: data.type,
        nullable: !data.notNull,
        default: data.default,
        isNullableOnCreate: data.default !== undefined || !data.notNull,
      };
    });
    return {
      entityName: table.getEntityName(),
      fields,
    };
  }

  private paramsToQueryName(...params: string[]) {
    return 'findBy' + params.map(capitalizeFirstLetter).join('And');
  }

  private createPrimaryQuery(table: TableHandler): IrQuery {
    return {
      queryName: this.paramsToQueryName(...table.primaryKey),
      returnType: table.getEntityName(),
      isReturnsArray: false,
      isReturnDefinitelyExist: false,
      params: table.primaryKey.map(it => ({ name: it, type: table.column(it)!.type })),
    };
  }

  private createRefQuery(ref: ReferenceColumn): IrQuery {
    return {
      queryName: this.paramsToQueryName(ref.name),
      returnType: ref.table.getEntityName(),
      isReturnsArray: !ref.data.unique,
      isReturnDefinitelyExist: false, // TODO RELATION
      params: [{ name: ref.name, type: ref.type }],
    };
  }

  private createRepository(table: TableHandler): IrRepository {
    const entityName = table.getEntityName();
    const queries: IrQuery[] = [];
    if (table.primaryKey.length > 1 || !table.column(table.primaryKey[0])!.isReference()) {
      queries.push(this.createPrimaryQuery(table));
    }
    queries.push(
      ...table.columns.filter(column => column.isReference()).map(it => this.createRefQuery(it as ReferenceColumn)),
    );

    return {
      tableName: table.tableName,
      entityName,
      primaryKeys: table.primaryKey,
      queries,
      useClasses: [
        {
          path: `entity/${table.tableName}`,
          classNames: [entityName, `${entityName}Creatable`, `${entityName}PrimaryKey`],
        },
      ],
    };
  }
}
