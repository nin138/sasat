import { TableHandler } from '../../entity/table';
import { IrGqlMutationEntity, IrGqlSubscription } from '../../ir/gql/mutation';
import { columnTypeToGqlPrimitive } from '../../generator/gql/columnToGqlType';
import { IrGqlParam } from '../../ir/gql/types';
import { MutationFunctionNode, MutationNode } from '../../node/gql/mutationNode';
import { EntityName } from '../../entity/entityName';
import { Parser } from '../parser';
import { ContextParamNode } from '../../node/gql/contextParamNode';
import { SubscriptionFilterNode } from '../../node/gql/subscriptionFilterNode';

export class GqlMutationParser {
  parse = (table: TableHandler): MutationNode => {
    return new MutationNode(
      new EntityName(table.getEntityName()),
      table.primaryKey,
      Parser.paramsToQueryName(...table.primaryKey),
      new MutationFunctionNode(table.gqlOption.mutation.create, table.gqlOption.subscription.onCreate),
      new MutationFunctionNode(table.gqlOption.mutation.update, table.gqlOption.subscription.onUpdate),
      new MutationFunctionNode(table.gqlOption.mutation.delete, table.gqlOption.subscription.onDelete),
      table.gqlOption.mutation.fromContextColumns.map(
        it => new ContextParamNode(it.column, it.contextName || it.column),
      ),
      table.gqlOption.subscription.filter.map(it => new SubscriptionFilterNode(it, table.column(it)!.gqlType())),
    );
  };

  // private getFromContextColumns(table: TableHandler) {
  //   return table.gqlOption.mutation.fromContextColumns.map(it => ({
  //     columnName: it.column,
  //     contextName: it.contextName || it.column,
  //   }));
  // }
  //
  // private getOnCreateParams(table: TableHandler): IrGqlParam[] {
  //   return table.columns
  //     .filter(it => !table.gqlOption.mutation.fromContextColumns.map(it => it.column).includes(it.name))
  //     .map(it => {
  //       return {
  //         name: it.name,
  //         type: it.gqlType(),
  //         isNullable: it.isNullableOnCreate(),
  //         isArray: false,
  //         isReference: false,
  //       };
  //     });
  // }
  //
  // private getOnUpdateParams(table: TableHandler): IrGqlParam[] {
  //   return table.columns
  //     .filter(it => !table.gqlOption.mutation.fromContextColumns.map(it => it.column).includes(it.getData().columnName))
  //     .map(it => {
  //       return {
  //         name: it.name,
  //         type: it.gqlType(),
  //         isNullable: !table.isColumnPrimary(it.name),
  //         isArray: false,
  //         isReference: false,
  //       };
  //     });
  // }
  //
  // private getOnDeleteParams(table: TableHandler): IrGqlParam[] {
  //   return table
  //     .primaryKeyColumns()
  //     .filter(it => !table.gqlOption.mutation.fromContextColumns.map(it => it.column).includes(it.name))
  //     .map(it => {
  //       return {
  //         name: it.name,
  //         type: it.gqlType(),
  //         isNullable: false,
  //         isArray: false,
  //         isReference: false,
  //       };
  //     });
  // }
  //
  // private getSubscriptionSetting(table: TableHandler): IrGqlSubscription {
  //   return {
  //     onCreate: table.gqlOption.subscription.onCreate,
  //     onUpdate: table.gqlOption.subscription.onUpdate,
  //     onDelete: table.gqlOption.subscription.onDelete,
  //     filter: table.gqlOption.subscription.filter.map(it => ({
  //       column: it,
  //       type: table.column(it)!.gqlType(),
  //     })),
  //   };
  // }
  //
  // private getPrimaryKeys(table: TableHandler) {
  //   return table.primaryKey.map(it => ({
  //     name: it,
  //     type: columnTypeToGqlPrimitive(table.column(it)!.type),
  //     isNullable: false,
  //     isArray: false,
  //     isReference: false,
  //   }));
  // }
}
