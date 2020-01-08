import { IrGql } from '../../../ir/gql';
import { IrGqlMutation } from '../../../ir/gql/mutation';

const getImportStatement = (ir: IrGqlMutation) => {
  const context = ir.entities.find(it => it.fromContextColumns.length !== 0)
    ? `\nimport { GqlContext } from '../context';`
    : '';
  return (
    [
      ...ir.entities.flatMap(it => [
        `import { ${it.entityName}, ${it.entityName}Creatable, ${it.entityName}PrimaryKey } from './entity/${it.entityName}'`,
        `import { ${it.entityName}Repository } from '../repository/${it.entityName}'`,
      ]),
    ].join('\n') + context
  );
};

const contextDestructuringAssignmentString = (
  fromContextColumns: Array<{ columnName: string; contextName: string }>,
): string => {
  return fromContextColumns.map(it => `${it.columnName}: context.${it.contextName},`).join('');
};

const createCreateMutation = (
  entityName: string,
  fromContextColumns: Array<{ columnName: string; contextName: string }>,
): string => {
  if (fromContextColumns.length === 0)
    return `create${entityName}: (_: {}, entity: ${entityName}Creatable) => new ${entityName}Repository().create(entity),`;
  return `create${entityName}: (_: {}, entity: ${entityName}Creatable, context: GqlContext) => new ${entityName}Repository().create({...entity,${contextDestructuringAssignmentString(
    fromContextColumns,
  )}}),`;
};

const createUpdateMutation = (
  entityName: string,
  fromContextColumns: Array<{ columnName: string; contextName: string }>,
): string => {
  if (fromContextColumns.length === 0)
    return `update${entityName}: (_: {}, entity: ${entityName}PrimaryKey & Partial<${entityName}>) => new ${entityName}Repository().update(entity).then(it => it.changedRows === 1),`;
  return `update${entityName}: (_: {}, entity: ${entityName}PrimaryKey & Partial<${entityName}>, context: GqlContext) => new ${entityName}Repository().update({...entity, ${contextDestructuringAssignmentString(
    fromContextColumns,
  )}}).then(it => it.changedRows === 1),`;
};

export const generateTsGqlMutationString = (ir: IrGql) => {
  const body = ir.mutations.entities
    .flatMap(it => {
      const ret = [];
      if (it.create) ret.push(createCreateMutation(it.entityName, it.fromContextColumns));
      if (it.update) ret.push(createUpdateMutation(it.entityName, it.fromContextColumns));
      return ret;
    })
    .join('\n');
  return `\
${getImportStatement(ir.mutations)}

export const mutation = {
${body}
};
`;
};
