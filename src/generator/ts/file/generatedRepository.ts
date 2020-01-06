import { IrQuery, IrRepository } from '../../../ir/repository';
import { columnTypeToTsType } from '../../../migration/column/columnTypes';
import * as SqlString from 'sqlstring';
import { TsFileGenerator } from '../tsFileGenerator';
import { TsAccessor, TsClassGenerator } from '../tsClassGenerator';

const importStatement = (ir: IrRepository): string => {
  const imports = ["import { SasatRepository } from 'sasat';\n", "import { getCurrentDateTimeString } from 'sasat';\n"];
  if (ir.subscription.onCreate || ir.subscription.onUpdate) {
    imports.push('import {pubsub, SubscriptionName} from "../subscription";\n');
  }
  return [...imports, ...ir.useClasses.map(it => `import {${it.classNames.join(', ')}} from '../${it.path}';\n`)].join(
    '',
  );
};

const getReturnType = (ir: IrQuery): string => {
  if (ir.isReturnsArray) return ir.returnType + '[]';
  if (ir.isReturnDefinitelyExist) return ir.returnType;
  return ir.returnType + ' | undefined';
};

const getFunctionBody = (ir: IrQuery) => {
  const getFindStatement = (ir: IrQuery) => `this.find({ where: { ${ir.params.map(it => it.name).join(', ')} } });`;
  if (ir.isReturnsArray) return 'return ' + getFindStatement(ir);
  return `const result = await ${getFindStatement(ir)}
  if (result.length === 0) return;
  return result[0];
  `;
};

const queries = (ir: IrRepository): string => {
  return ir.queries
    .map(it => {
      const params = it.params.map(it => `${it.name}: ${columnTypeToTsType(it.type)}`).join(', ');
      const returnType = `Promise<${getReturnType(it)}>`;
      return `${it.isReturnsArray ? '' : 'async'} ${it.queryName}(${params}): ${returnType} {
    ${getFunctionBody(it)}
    }`;
    })
    .join('\n');
};

const createFn = (ir: IrRepository) => {
  if (!ir.subscription.onCreate) return '';
  return `\
async create(entity: ${ir.entityName}Creatable): Promise<${ir.entityName}> {
  const result = super.create(entity);
  await pubsub.publish(SubscriptionName.${ir.entityName}Created, { ${ir.entityName}Created: result });
  return result;
}
`;
};

const updateFn = (ir: IrRepository) => {
  if (!ir.subscription.onUpdate) return '';
  const onUpdateColumns = ir.onUpdateCurrentTimestampColumns.map(it => `'${it}',`).join('');
  const onUpdateValues = ir.onUpdateCurrentTimestampColumns.map(it => `${it}: getCurrentDateTimeString(),`).join('');
  return `\
async update(entity: ${ir.entityName}PrimaryKey & Partial<${ir.entityName}>) {
  const result = await super.update(entity);
  if(result.changedRows === 1) {
    await pubsub.publish(SubscriptionName.${ir.entityName}Updated, { ${ir.entityName}Updated: { _updatedColumns: [${onUpdateColumns} ...Object.keys(entity)] ,${onUpdateValues}...entity } });
  }
  return result;
}
`;
};

const classDeclaration = (ir: IrRepository): string => {
  return `export abstract class Generated${ir.entityName}Repository extends SasatRepository\
<${ir.entityName}, ${ir.entityName}Creatable, ${ir.entityName}PrimaryKey> {
readonly tableName = '${ir.tableName}';
protected readonly primaryKeys = [${ir.primaryKeys.map(it => `'${it}',`).join('')}];
protected readonly autoIncrementColumn = ${ir.autoIncrementColumn ? `'${ir.autoIncrementColumn}'` : 'undefined'};
protected getDefaultValueString() {
return {${[
    ...ir.defaultValues.map(it => `${it.columnName}: ${it.value === null ? 'null' : SqlString.escape(it.value)}`),
    ...ir.defaultCurrentTimestampColumns.map(it => it + ': getCurrentDateTimeString()'),
  ].join(',')}}
};
${createFn(ir)}
${updateFn(ir)}
${queries(ir)}
};
`;
};

export const generateGeneratedRepositoryString = (repository: IrRepository) => {
  return importStatement(repository) + classDeclaration(repository);
};

export class GeneratedRepositoryGenerator extends TsFileGenerator {
  constructor(readonly repository: IrRepository) {
    super();
    this.addImport('sasat', 'SasatRepository');
    if (repository.subscription.onCreate || repository.subscription.onUpdate) {
      this.addImport('../subscription', 'pubsub', 'SubscriptionName');
    }

    if (
      repository.onUpdateCurrentTimestampColumns.length !== 0 ||
      repository.defaultCurrentTimestampColumns.length !== 0
    ) {
      this.addImport('sasat', 'getCurrentDateTimeString');
    }

    repository.useClasses.forEach(it => {
      this.addImport('../' + it.path, ...it.classNames);
    });

    const entityName = repository.entityName;
    const classGenerator = new TsClassGenerator(
      `Generated${repository.entityName}<${entityName}, ${entityName}Creatable, ${entityName}PrimaryKey>`,
      {
        exportClass: true,
        extends: 'SasatRepository',
        abstract: true,
      },
    );
    classGenerator.addField(
      {
        readonly: true,
        name: 'tableName',
        defaultValue: `'${repository.tableName}'`,
      },
      {
        accessor: TsAccessor.protected,
        readonly: true,
        name: 'primaryKeys',
        defaultValue: `[${repository.primaryKeys.map(it => `'${it}'`).join(',')}]`,
      },
      {
        accessor: TsAccessor.protected,
        readonly: true,
        name: 'autoIncrementColumn',
        defaultValue: repository.autoIncrementColumn ? `'${repository.autoIncrementColumn}'` : 'undefined',
      },
    );

    classGenerator.addMethod({
      accessor: TsAccessor.protected,
      name: 'getDefaultValueString',
      body: `return {${[
        ...repository.defaultValues.map(
          it => `${it.columnName}: ${it.value === null ? 'null' : SqlString.escape(it.value)}`,
        ),
        ...repository.defaultCurrentTimestampColumns.map(it => it + ': getCurrentDateTimeString()'),
      ].join(',')}};`,
      args: [],
    });

    if (repository.subscription.onCreate) {
      classGenerator.addMethod({
        async: true,
        name: 'create',
        args: [
          {
            name: 'entity',
            type: `${entityName}Creatable`,
          },
        ],
        returnType: `Promise<${entityName}>`,
        body: `const result = super.create(entity);
        await pubsub.publish(SubscriptionName.${entityName}Created, { ${entityName}Created: result });
        return result;`,
      });
    }

    if (repository.subscription.onUpdate) {
      const onUpdateColumns = repository.onUpdateCurrentTimestampColumns.map(it => `'${it}',`).join('');
      const onUpdateValues = repository.onUpdateCurrentTimestampColumns
        .map(it => `${it}: getCurrentDateTimeString(),`)
        .join('');
      const body = `const result = await super.update(entity);
        if(result.changedRows === 1) {
          await pubsub.publish(SubscriptionName.${entityName}Updated, { ${entityName}Updated: { _updatedColumns: [${onUpdateColumns} ...Object.keys(entity)] ,${onUpdateValues}...entity } });
        }
        return result;`;
      classGenerator.addMethod({
        async: true,
        name: 'update',
        args: [
          {
            name: 'entity',
            type: `${entityName}PrimaryKey & Partial<${entityName}>`,
          },
        ],
        body,
      });
    }
    classGenerator.addMethod(
      ...repository.queries.map(it => ({
        name: it.queryName,
        async: !it.isReturnsArray,
        args: it.params.map(it => ({ name: it.name, type: columnTypeToTsType(it.type) })),
        body: getFunctionBody(it),
      })),
    );
  }
}
