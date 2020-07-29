import { IrQuery, IrRepository } from '../../../ir/repository';
import { columnTypeToTsType } from '../../../migration/column/columnTypes';
import * as SqlString from 'sqlstring';
import { TsFileGenerator } from '../tsFileGenerator';
import { TsAccessor, TsClassGenerator, TsClassMethod } from '../tsClassGenerator';
import { creatableInterfaceName, identifiableInterfaceName } from '../../../constants/interfaceConstants';

const getFunctionBody = (ir: IrQuery) => {
  const getFindStatement = (ir: IrQuery) => `this.find({ where: { ${ir.params.map(it => it.name).join(', ')} } });`;
  if (ir.isReturnsArray) return 'return ' + getFindStatement(ir);
  return `const result = await ${getFindStatement(ir)}
  if (result.length === 0) return;
  return result[0];
  `;
};

export class TsGeneratorGeneratedRepository extends TsFileGenerator {
  constructor(readonly repository: IrRepository) {
    super();
  }

  generate(): string {
    this.addImports(this.repository);
    const classString = this.generateClass(this.repository);
    this.addLine(classString);
    return super.generate();
  }

  private addImports(repository: IrRepository) {
    this.addImport('sasat', 'SasatRepository');

    if (
      repository.onUpdateCurrentTimestampColumns.length !== 0 ||
      repository.defaultCurrentTimestampColumns.length !== 0
    ) {
      this.addImport('sasat', 'getCurrentDateTimeString');
    }

    repository.useClasses.forEach(it => {
      this.addImport('../' + it.path, ...it.classNames);
    });
  }

  private generateClass(repository: IrRepository): string {
    const entityName = repository.entityName;
    const classGenerator = new TsClassGenerator(`Generated${repository.entityName}Repository`, {
      exportClass: true,
      extends: `SasatRepository<${entityName}, ${creatableInterfaceName(entityName)}, ${identifiableInterfaceName(
        entityName,
      )}>`,
      abstract: true,
    });
    classGenerator.addField(...this.getFields(repository));
    classGenerator.addMethod(...this.getMethods(repository));
    return classGenerator.generate();
  }

  private getFields(repository: IrRepository) {
    return [
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
    ];
  }

  private methodCreate(entityName: string): TsClassMethod {
    return {
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
    };
  }

  private methodUpdate(entityName: string, onUpdateCurrentTimestampColumns: string[]): TsClassMethod {
    const onUpdateColumns = onUpdateCurrentTimestampColumns.map(it => `'${it}',`).join('');
    const onUpdateValues = onUpdateCurrentTimestampColumns.map(it => `${it}: getCurrentDateTimeString(),`).join('');
    const body = `const result = await super.update(entity);
        if(result.changedRows === 1) {
          await pubsub.publish(SubscriptionName.${entityName}Updated, { ${entityName}Updated: { _updatedColumns: [${onUpdateColumns} ...Object.keys(entity)] ,${onUpdateValues}...entity } });
        }
        return result;`;
    return {
      async: true,
      name: 'update',
      args: [
        {
          name: 'entity',
          type: `${identifiableInterfaceName(entityName)} & Partial<${entityName}>`,
        },
      ],
      body,
    };
  }

  private getMethods(repository: IrRepository) {
    const methods: TsClassMethod[] = [
      {
        accessor: TsAccessor.protected,
        name: 'getDefaultValueString',
        body: `return {${[
          ...repository.defaultValues.map(
            it => `${it.columnName}: ${it.value === null ? 'null' : SqlString.escape(it.value)}`,
          ),
          ...repository.defaultCurrentTimestampColumns.map(it => it + ': getCurrentDateTimeString()'),
        ].join(',')}};`,
        args: [],
      },
    ];

    methods.push(
      ...repository.queries.map(it => ({
        name: it.queryName,
        async: !it.isReturnsArray,
        args: it.params.map(it => ({
          name: it.name,
          type: columnTypeToTsType(it.type),
        })),
        body: getFunctionBody(it),
      })),
    );

    return methods;
  }
}
