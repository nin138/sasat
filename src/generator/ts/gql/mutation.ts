import { IrGql } from '../../../ir/gql';
import { IrGqlMutation } from '../../../ir/gql/mutation';

const getImportStatement = (ir: IrGqlMutation) => {
  return [
    'import {pubsub, SubscriptionName} from "./subscription"',
    ...ir.entities.flatMap(it => [
      `import { ${it.entityName}, ${it.entityName}Creatable, ${it.entityName}PrimaryKey } from './entity/${it.entityName}'`,
      `import { ${it.entityName}Repository } from '../repository/${it.entityName}'`,
    ]),
  ].join('\n');
};

const createCreateMutation = (entityName: string, subscription: boolean): string => {
  if (!subscription)
    return `create${entityName}: (_: {}, entity: ${entityName}Creatable) => new ${entityName}Repository().create(entity),`;
  return `create${entityName}: async (_: {}, entity: ${entityName}Creatable) => {
    const result = await new ${entityName}Repository().create(entity);
    await pubsub.publish(SubscriptionName.${entityName}Created, { ${entityName}Created: result });
    return result;
  },`;
};

const createUpdateMutation = (entityName: string, subscription: boolean): string => {
  if (!subscription)
    return `update${entityName}: (_: {}, entity: ${entityName}PrimaryKey & Partial<${entityName}>) => new ${entityName}Repository().update(entity).then(it => it.affectedRows === 1),`;
  return `  update${entityName}: async (_: {}, entity: ${entityName}PrimaryKey & Partial<${entityName}>) => {
    const result = await new ${entityName}Repository().update(entity).then(it => it.affectedRows === 1) ;
    await pubsub.publish(SubscriptionName.${entityName}Created, { ${entityName}Created: result });
    return result;
  },`;
};

export const generateTsGqlMutationString = (ir: IrGql) => {
  const body = ir.mutations.entities
    .flatMap(it => [
      createCreateMutation(it.entityName, it.subscription.onCreate),
      createUpdateMutation(it.entityName, it.subscription.onUpdate),
    ])
    .join('\n');
  return `\
${getImportStatement(ir.mutations)}

export const mutation = {
${body}
};
`;
};
