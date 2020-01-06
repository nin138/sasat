import { IrGql } from '../../../ir/gql';
import { IrGqlMutation } from '../../../ir/gql/mutation';

const getImportStatement = (ir: IrGqlMutation) => {
  return [
    ...ir.entities.flatMap(it => [
      `import { ${it.entityName}, ${it.entityName}Creatable, ${it.entityName}PrimaryKey } from './entity/${it.entityName}'`,
      `import { ${it.entityName}Repository } from '../repository/${it.entityName}'`,
    ]),
  ].join('\n');
};

const createCreateMutation = (entityName: string): string => {
  return `create${entityName}: (_: {}, entity: ${entityName}Creatable) => new ${entityName}Repository().create(entity),`;
};

const createUpdateMutation = (entityName: string): string => {
  return `update${entityName}: (_: {}, entity: ${entityName}PrimaryKey & Partial<${entityName}>) => new ${entityName}Repository().update(entity).then(it => it.changedRows === 1),`;
};

export const generateTsGqlMutationString = (ir: IrGql) => {
  const body = ir.mutations.entities
    .flatMap(it => [createCreateMutation(it.entityName), createUpdateMutation(it.entityName)])
    .join('\n');
  return `\
${getImportStatement(ir.mutations)}

export const mutation = {
${body}
};
`;
};
