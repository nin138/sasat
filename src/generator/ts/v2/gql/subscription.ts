import { TsFileGenerator } from '../../tsFileGenerator';
import { IrGqlMutation } from '../../../../ir/gql/mutation';
import { identifiableInterfaceName } from '../../../../constants/interfaceConstants';
import { tsArrowFunction } from '../../code/arrowFunction';

export class TsGeneratorGqlSubscription extends TsFileGenerator {
  constructor(ir: IrGqlMutation) {
    super();
    this.addImport('../pubsub', 'pubsub');
    if (ir.entities.find(it => it.subscription.filter.length !== 0)) {
      this.addImport('graphql-subscriptions', 'withFilter');
    }
    const subscriptions = ir.entities.flatMap(it => {
      const result = [];
      if (it.subscription.onCreate) {
        result.push({
          name: `${it.entityName}Created`,
          filter: it.subscription.filter,
          entity: it.entityName,
        });
        this.addImport(`./entity/${it.entityName}`, it.entityName);
      }
      if (it.subscription.onUpdate) {
        result.push({
          name: `${it.entityName}Updated`,
          filter: it.subscription.filter,
          entity: it.entityName,
        });
        this.addImport(`./entity/${it.entityName}`, it.entityName);
      }
      if (it.subscription.onDelete) {
        result.push({
          name: `${it.entityName}Deleted`,
          filter: it.subscription.filter,
          entity: identifiableInterfaceName(it.entityName),
        });
        this.addImport(`./entity/${it.entityName}`, identifiableInterfaceName(it.entityName));
      }

      return result;
    });
    const names = subscriptions.map(it => `${it.name} = '${it.name}',`);
    const functions = subscriptions.map(it => {
      if (it.filter.length === 0)
        return `${it.name}: { subscribe: () => pubsub.asyncIterator([SubscriptionName.${it.name}]), },`;
      return `${it.name}: { subscribe: withFilter(() => pubsub.asyncIterator([SubscriptionName.${it.name}]),
      async (payload, variables) => {
        const result = await payload.${it.name};
        return ${it.filter.map(it => `result.${it.column} === variables.${it.column}`).join('&&')};
      },
    ),},`;
    });

    const publishFunctions = subscriptions.map(it => {
      return `export const publish${it.name} = ${tsArrowFunction(
        [{ name: 'entity', type: it.entity }],
        'Promise<void>',
        `pubsub.publish(SubscriptionName.${it.name}, { ${it.name}: entity })`,
      )}`;
    });

    this.addLine(
      `export enum SubscriptionName {${names.join('\n')}};`,
      `export const subscription = {${functions.join('\n')}};`,
      ...publishFunctions,
    );
  }
}
