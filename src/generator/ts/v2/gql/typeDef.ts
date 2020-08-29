import { IrGql } from '../../../../ir/gql';
import { getGqlTypeString } from '../../../gql/typeDef';
import { MutationNode } from '../../../../node/gql/mutationNode';
import { SubscriptionFilterNode } from '../../../../node/gql/subscriptionFilterNode';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { TsFile } from '../file';
import { QueryNode } from '../../../../node/gql/queryNode';
import { tsg } from '../code/factory';
import { IrGqlType } from '../../../../ir/gql/types';

export class TypeDefGenerator {
  generate(gql: IrGql): TsFile {
    const types = [
      ...this.createTypes(gql.types),
      this.createQuery(gql.queries),
      this.createMutation(gql.mutations),
      this.createSubscription(gql.mutations),
    ].filter(it => it !== undefined) as PropertyAssignment[];
    return new TsFile(tsg.variable('const', tsg.identifier('typeDef'), tsg.object(...types)).export());
  }
  private createTypes(types: IrGqlType[]): PropertyAssignment[] {
    return types.map(type =>
      tsg.propertyAssign(
        type.typeName,
        tsg.array(type.params.map(it => tsg.string(`${it.name}: ${getGqlTypeString(it)}`))),
      ),
    );
  }

  private createQuery(nodes: QueryNode[]): PropertyAssignment {
    return tsg.propertyAssign('Query', tsg.array(nodes.map(it => tsg.string(it.toGqlString()))));
  }

  private createMutation(nodes: MutationNode[]): PropertyAssignment {
    return tsg.propertyAssign('Mutation', tsg.array(nodes.map(it => tsg.string(it.toTypeDefString()))));
  }

  private createSubscription(nodes: MutationNode[]): PropertyAssignment | undefined {
    const createParam = (filters: SubscriptionFilterNode[]): string => {
      if (filters.length === 0) return '';
      return `(${filters.map(it => `${it.columnName}: ${it.type}!`).join(', ')})`;
    };
    const subscriptions = nodes
      .filter(it => it.subscribed)
      .map(it => {
        const returnType = MutationNode.isDeleteMutation(it) ? `${it.entityName}!` : `Deleted${it.entityName}!`;
        return `${it.entityName}${it.type}${createParam(it.subscriptionFilters)}: ${returnType}`;
      })
      .map(tsg.string);
    if (subscriptions.length === 0) return undefined;
    return new PropertyAssignment('Subscription', tsg.array(subscriptions));
  }
}
//
// export const generateTsTypeDef = (gql: IrGql) => {
//   const obj = new TsCodeGenObject();
//   obj.set(
//     'Mutation',
//     tsArrayString(
//       gql.mutations.map(it => {
//         if (MutationNode.isCreateMutation(it)) {
//           const params = GqlParamNode.paramsToString(it.entity.onCreateRequiredFields().map(it => it.toGqlParam()));
//           return `create${it.entityName}${params}: ${it.entityName}!`;
//         }
//         if (MutationNode.isUpdateMutation(it)) {
//           const params = GqlParamNode.paramsToString([
//             ...it.entity
//               .identifiableFields()
//               .map(it => it.toGqlParam(), ...it.entity.dataFields().map(it => it.toOptionalGqlParam())),
//           ]);
//           return `update${it.entityName}${params}: Boolean!`;
//         }
//         const params = GqlParamNode.paramsToString(it.entity.identifiableFields().map(it => it.toGqlParam()));
//         return `delete${it.entityName}${params}: Boolean!`;
//       }),
//     ),
//   );
//
//   const createParam = (filters: SubscriptionFilterNode[]): string => {
//     if (filters.length === 0) return '';
//     return `(${filters.map(it => `${it.columnName}: ${it.type}!`).join(', ')})`;
//   };
//   const list = gql.mutations
//     .filter(it => it.subscribed)
//     .map(it => {
//       if (MutationNode.isCreateMutation(it)) {
//         return `${it.entityName}Created${createParam(it.subscriptionFilters)}: ${it.entityName}!`;
//       }
//       if (MutationNode.isUpdateMutation(it)) {
//         return `${it.entityName}Updated${createParam(it.subscriptionFilters)}: ${it.entityName}!`;
//       }
//       return `${it.entityName}Deleted${createParam(it.subscriptionFilters)}: Deleted${it.entityName}!`;
//     });
//   if (list.length === 0) return '';
//   obj.set('Subscription', tsArrayString(list.sort()));
//
//   return `export const typeDef = ${obj.toTsString()}`;
// };
