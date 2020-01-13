import { IrGql } from '../ir/gql';
import { DataStoreHandler } from '../entity/dataStore';
import { IrGqlType } from '../ir/gql/types';
import { IrGqlQuery, IrGqlQueryType } from '../ir/gql/query';
import { capitalizeFirstLetter, plural } from '../util/stringUtil';
import { IrGqlMutation, IrGqlMutationEntity } from '../ir/gql/mutation';
import { TableHandler } from '../entity/table';
import { columnTypeToGqlPrimitive } from '../generator/gql/sasatToGqlType';
import { ReferenceColumn } from '../entity/referenceColumn';
import { Relation } from '..';
import { IrGqlResolver } from '../ir/gql/resolver';

export class GqlCompiler {
  constructor(private store: DataStoreHandler) {}

  compile(): IrGql {
    const types: IrGqlType[] = this.store.tables.map(it => ({
      typeName: it.getEntityName(),
      params: [
        ...it.columns.map(it => ({
          name: it.name,
          type: columnTypeToGqlPrimitive(it.type),
          isNullable: it.isNullable(),
          isArray: false,
        })),
        ...it.columns
          .filter(it => it.isReference())
          .map(it => {
            const ref = it as ReferenceColumn;
            return {
              name: ref.data.relationName || ref.data.targetTable,
              type: capitalizeFirstLetter(ref.data.targetTable),
              isNullable: false,
              isArray: false,
              isReference: true,
            };
          }),
        ...this.store.referencedBy(it.tableName).map(it => ({
          name: it.table.tableName,
          type: it.table.getEntityName(),
          isNullable: it.data.relation === Relation.OneOrZero,
          isArray: it.data.relation === Relation.Many,
          isReference: true,
        })),
      ],
    }));

    return {
      types: types,
      queries: [...this.listQuery(), ...this.primaryQuery()],
      mutations: this.getMutations(),
      contexts: this.store.tables.flatMap(table =>
        table.gqlOption.mutation.fromContextColumns.map(it => ({
          name: it.contextName || it.column,
          type: table.column(it.column)!.type,
        })),
      ),
      resolvers: [], // TODO
    };
  }

  private getMutation(table: TableHandler): IrGqlMutationEntity {
    return {
      entityName: table.getEntityName(),
      create: table.gqlOption.mutation.create,
      update: table.gqlOption.mutation.create,
      fromContextColumns: table.gqlOption.mutation.fromContextColumns.map(it => ({
        columnName: it.column,
        contextName: it.contextName || it.column,
      })),
      onCreateParams: table.columns
        .filter(it => !table.gqlOption.mutation.fromContextColumns.map(it => it.column).includes(it.name))
        .map(it => {
          return {
            name: it.name,
            type: it.gqlType(),
            isNullable: it.isNullableOnCreate(),
            isArray: false,
          };
        }),
      onUpdateParams: table.columns
        .filter(it => !table.gqlOption.mutation.fromContextColumns.map(it => it.column).includes(it.name))
        .map(it => {
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

  private resolver(): IrGqlResolver[] {
    return this.store.tables.flatMap(table =>
      table.columns
        .filter(it => it.isReference())
        .flatMap(it => {
          const ref = it as ReferenceColumn;
          return [
            {
              entity: table.getEntityName(),
              fieldName: ref.data.columnName,
              referenceEntity: capitalizeFirstLetter(ref.data.targetTable),
              referenceColumn: ref.data.targetColumn,
              referenceName: ref.data.relationName || ref.table.tableName,
            },
            {
              entity: capitalizeFirstLetter(ref.data.targetTable),
              fieldName: ref.data.targetColumn,
              referenceEntity: table.getEntityName(),
              referenceColumn: ref.data.columnName,
              referenceName: ref.table.tableName,
            },
          ];
        }),
    );
  }
}
