import { TableHandler } from '../../entity/table';
import { IrGqlMutationEntity, IrGqlSubscription } from '../../ir/gql/mutation';
import { columnTypeToGqlPrimitive } from '../../generator/gql/columnToGqlType';
import { IrGqlParam } from '../../ir/gql/types';

export class GqlMutationParser {
  parse(table: TableHandler): IrGqlMutationEntity {
    return {
      entityName: table.getEntityName(),
      primaryKeys: this.getPrimaryKeys(table),
      create: table.gqlOption.mutation.create,
      update: table.gqlOption.mutation.create,
      delete: table.gqlOption.mutation.delete,
      fromContextColumns: this.getFromContextColumns(table),
      onCreateParams: this.getOnCreateParams(table),
      onUpdateParams: this.getOnUpdateParams(table),
      onDeleteParams: this.getOnDeleteParams(table),
      subscription: this.getSubscriptionSetting(table),
    };
  }

  private getFromContextColumns(table: TableHandler) {
    return table.gqlOption.mutation.fromContextColumns.map(it => ({
      columnName: it.column,
      contextName: it.contextName || it.column,
    }));
  }

  private getOnCreateParams(table: TableHandler): IrGqlParam[] {
    return table.columns
      .filter(it => !table.gqlOption.mutation.fromContextColumns.map(it => it.column).includes(it.name))
      .map(it => {
        return {
          name: it.name,
          type: it.gqlType(),
          isNullable: it.isNullableOnCreate(),
          isArray: false,
          isReference: false,
        };
      });
  }

  private getOnUpdateParams(table: TableHandler): IrGqlParam[] {
    return table.columns
      .filter(it => !table.gqlOption.mutation.fromContextColumns.map(it => it.column).includes(it.name))
      .map(it => {
        return {
          name: it.name,
          type: it.gqlType(),
          isNullable: !table.isColumnPrimary(it.name),
          isArray: false,
          isReference: false,
        };
      });
  }

  private getOnDeleteParams(table: TableHandler): IrGqlParam[] {
    return table
      .primaryKeyColumns()
      .filter(it => !table.gqlOption.mutation.fromContextColumns.map(it => it.column).includes(it.name))
      .map(it => {
        return {
          name: it.name,
          type: it.gqlType(),
          isNullable: false,
          isArray: false,
          isReference: false,
        };
      });
  }

  private getSubscriptionSetting(table: TableHandler): IrGqlSubscription {
    return {
      onCreate: table.gqlOption.subscription.onCreate,
      onUpdate: table.gqlOption.subscription.onUpdate,
      onDelete: table.gqlOption.subscription.onDelete,
      filter: table.gqlOption.subscription.filter.map(it => ({
        column: it,
        type: table.column(it)!.gqlType(),
      })),
    };
  }

  private getPrimaryKeys(table: TableHandler) {
    return table.primaryKey.map(it => ({
      name: it,
      type: columnTypeToGqlPrimitive(table.column(it)!.type),
      isNullable: false,
      isArray: false,
      isReference: false,
    }));
  }
}
