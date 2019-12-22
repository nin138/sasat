import { IrGql } from '../../../../ir/gql';
import { IrGqlMutation } from '../../../../ir/gql/mutation';

const getImportStatement = (ir: IrGqlMutation) => {
  return ir.entities
    .flatMap(it => [
      `import { ${it.entityName}, ${it.entityName}Creatable, ${it.entityName}PrimaryKey } from './entity/${it.entityName}'`,
      `import { ${it.entityName}Repository } from '../repository/${it.entityName}'`,
    ])
    .join('\n');
};

export const generateTsGqlMutationString = (ir: IrGql) => {
  const body = ir.mutations.entities
    .flatMap(it => [
      `  create${it.entityName}: (_: {}, entity: ${it.entityName}Creatable) => new ${it.entityName}Repository().create(entity),`,
      `  update${it.entityName}: (_: {}, entity: ${it.entityName}PrimaryKey & Partial<${it.entityName}>) => new ${it.entityName}Repository().update(entity).then(it => it.affectedRow === 1),`,
    ])
    .join('\n');
  return `\
${getImportStatement(ir.mutations)}

export const mutation = {
${body}
};
`;
};
