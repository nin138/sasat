import { IrGql } from '../ir/gql';
import { DataStoreHandler } from '../entity/dataStore';
import { IrGqlType } from '../ir/gql/types';
import { IrGqlQuery, IrGqlQueryType } from '../ir/gql/query';
import { capitalizeFirstLetter, plural } from '../util/stringUtil';
import { IrGqlMutation, IrGqlMutationEntity } from '../ir/gql/mutation';
import { TableHandler } from '../entity/table';
import { columnTypeToGqlPrimitive } from '../generator/gql/sasatToGqlType';

export class GqlCompiler {
  constructor(private store: DataStoreHandler) {}

  compile(): IrGql {
    const types: IrGqlType[] = this.store.tables.map(it => ({
      typeName: it.getEntityName(),
      params: it.columns.map(it => ({
        name: it.name,
        type: columnTypeToGqlPrimitive(it.type),
        isNullable: it.isNullable(),
        isArray: false,
      })),
    }));

    return {
      types: types,
      queries: [...this.listQuery(), ...this.primaryQuery()],
      mutations: this.getMutations(),
    };
  }

  private getMutation(table: TableHandler): IrGqlMutationEntity {
    return {
      entityName: table.getEntityName(),
      onCreateParams: table.columns.map(it => {
        return {
          name: it.name,
          type: it.gqlType(),
          isNullable: it.isNullableOnCreate(),
          isArray: false,
        };
      }),
      onUpdateParams: table.columns.map(it => {
        return {
          name: it.name,
          type: it.gqlType(),
          isNullable: !table.isColumnPrimary(it.name),
          isArray: false,
        };
      }),
      subscription: {
        onCreate: table.gqlOption.subscription.onCreate,
        onUpdate: table.gqlOption.subscription.onUpdate,
      },
    };
  }

  private getMutations(): IrGqlMutation {
    return {
      entities: this.store.tables.map(it => this.getMutation(it)),
    };
  }

  private listQuery(): IrGqlQuery[] {
    return this.store.tables.map(it => ({
      queryName: plural(it.tableName),
      queryType: IrGqlQueryType.List,
      entity: it.getEntityName(),
      params: [],
      repositoryFunctionName: 'list',
      isArray: true,
      isNullable: false,
    }));
  }

  private primaryQuery(): IrGqlQuery[] {
    return this.store.tables.map(table => ({
      queryName: table.tableName,
      queryType: IrGqlQueryType.Primary,
      entity: table.getEntityName(),
      params: table.primaryKey.map(it => ({
        name: it,
        type: table.column(it)!.gqlType(),
        isNullable: false,
        isArray: false,
      })),
      repositoryFunctionName: 'findBy' + table.primaryKey.map(capitalizeFirstLetter).join('And'),
      isArray: false,
      isNullable: true,
    }));
  }
}
