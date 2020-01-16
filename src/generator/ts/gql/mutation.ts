import { IrGql } from '../../../ir/gql';
import { tsArrowFunction } from '../code/arrowFunction';
import { TsFileGenerator } from '../tsFileGenerator';
import { TsCodeGenObject } from '../code/object';
import { Compiler } from '../../../compiler/compiler';

const contextDestructuringAssignmentString = (
  fromContextColumns: Array<{ columnName: string; contextName: string }>,
): string => {
  return fromContextColumns.map(it => `${it.columnName}: context.${it.contextName},`).join('');
};

export class TsCodeGeneratorGqlMutation extends TsFileGenerator {
  constructor(gql: IrGql) {
    super();
    if (gql.mutations.entities.find(it => it.fromContextColumns.length !== 0))
      this.addImport('../context', 'GqlContext');

    const mutationObject = new TsCodeGenObject();
    gql.mutations.entities.forEach(it => {
      this.addImport(
        `./entity/${it.entityName}`,
        it.entityName,
        `${it.entityName}Creatable`,
        `${it.entityName}PrimaryKey`,
      );
      this.addImport(`../repository/${it.entityName}`, `${it.entityName}Repository`);
      if (it.create) {
        mutationObject.set(
          `create${it.entityName}`,
          this.createMutation(it.entityName, it.fromContextColumns, it.subscription.onCreate),
        );
      }
      if (it.update) {
        mutationObject.set(
          `update${it.entityName}`,
          this.updateMutation(it.entityName, it.fromContextColumns, it.subscription.onUpdate, it.primaryKeys),
        );
      }
    });
    this.addLine(`export const mutation = ${mutationObject.toTsString()}`);
  }

  private createParam(fromContextColumns: Array<{ columnName: string; contextName: string }>): string {
    if (fromContextColumns.length === 0) return 'entity';
    return `{...entity,${contextDestructuringAssignmentString(fromContextColumns)}}`;
  }

  private createMutation(
    entityName: string,
    fromContextColumns: Array<{ columnName: string; contextName: string }>,
    subscription: boolean,
  ): string {
    const params = [
      { name: '_', type: '{}' },
      { name: 'entity', type: `${entityName}Creatable` },
    ];
    if (fromContextColumns.length !== 0) params.push({ name: 'context', type: 'GqlContext' });

    let fn = `new ${entityName}Repository().create(${this.createParam(fromContextColumns)})`;
    if (subscription) {
      fn = `{const result = await ${fn};
    await publish${entityName}Created(result);
    return result;}`;
      this.addImport('./subscription', `publish${entityName}Created`);
    }
    return tsArrowFunction(params, `Promise<${entityName}>`, fn, subscription);
  }

  private updateMutation(
    entityName: string,
    fromContextColumns: Array<{ columnName: string; contextName: string }>,
    subscription: boolean,
    primaryKeys: string[],
  ): string {
    const params = [
      { name: '_', type: '{}' },
      { name: 'entity', type: `${entityName}PrimaryKey & Partial<${entityName}>` },
    ];
    if (fromContextColumns.length !== 0) params.push({ name: 'context', type: 'GqlContext' });
    let fn = `new ${entityName}Repository().update(${this.createParam(
      fromContextColumns,
    )}).then(it => it.changedRows === 1)`;
    if (subscription) {
      fn = `{const result = await ${fn};
       if(result) await publish${entityName}Updated(
        new ${entityName}Repository.${Compiler.paramsToQueryName(...primaryKeys)}(
          ${primaryKeys.map(it => `entity.${it}`).join(',')}
        ));
       return result;
      }`;
      this.addImport('./subscription', `publish${entityName}Updated`);
    }
    return tsArrowFunction(params, 'Promise<boolean>', fn, subscription);
  }
}
