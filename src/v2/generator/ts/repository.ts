import { IrQuery, IrRepository } from '../../../ir/repository';
import { columnTypeToTsType } from '../../../migration/column/columnTypes';

const importStatement = (ir: IrRepository): string => {
  return [
    "import { SasatRepository } from 'sasat';\n",
    ...ir.useClasses.map(it => `import {${it.classNames.join(', ')}} from '../${it.path}';\n`),
  ].join('');
};

const getReturnType = (ir: IrQuery): string => {
  if (ir.isReturnsArray) return ir.returnType + '[]';
  if (ir.isReturnDefinitelyExist) return ir.returnType;
  return ir.returnType + ' | undefined';
};

const getFunctionBody = (ir: IrQuery) => {
  const getFindStatement = (ir: IrQuery) => `this.find({ where: { ${ir.params.map(it => it.name).join(', ')} } });`;
  if (ir.isReturnsArray) return 'return ' + getFindStatement(ir);
  return `const result = ${getFindStatement(ir)}
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

const classDeclaration = (ir: IrRepository): string => {
  return `export abstract class Generated${ir.entityName}Repository extends SasatRepository\
<${ir.entityName}, ${ir.entityName}Creatable, ${ir.entityName}PrimaryKey> {
readonly tableName = '${ir.tableName}';
protected readonly primaryKeys = [${ir.primaryKeys.map(it => `'${it}',`).join('')}];
${queries(ir)}
};
`;
};

export const generateRepositoryString = (repository: IrRepository) => {
  return importStatement(repository) + classDeclaration(repository);
};
