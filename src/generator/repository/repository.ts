import * as path from 'path';
import { arrayEq, camelize, capitalizeFirstLetter, writeFileIfNotExists } from '../../util';
import { writeFile } from 'fs-extra';
import { getFindQueries } from '../func/getFindQueries';
import { TableGenerator } from '../store';

// TODO refactoring
const createFindFunction = (
  name: string,
  params: string[],
  returns: string,
  findParamMap: string[],
  unique: boolean,
) => `\
  async findBy${capitalizeFirstLetter(camelize(name))}(${params.join(', ')}): Promise<${returns}> {
    const result = await this.findBy({
      ${findParamMap.join(',\n      ')},
    });
    ${unique ? `if (result.length === 0) return;\n    return result[0];` : 'return result;'}
  }
`;

export class RepositoryGenerator {
  private imports: string[] = ["import { SasatRepository } from 'sasat';"];
  private importEntities: string[] = [];
  constructor(private table: TableGenerator) {
    this.imports.push(
      `import { ${table.entityName()}, Creatable${table.entityName()} } from '../entity/${table.tableName}';`,
    );
  }

  private createFindBy = (keys: string[], table: TableGenerator) => {
    const isUnique = () =>
      [
        table.primaryKey,
        ...table.uniqueKeys,
        ...table.columns.filter(it => it.isReference() && it.info.reference!.unique).map(it => [it.name]),
      ].find(it => arrayEq(it, keys)) !== undefined;

    const columns = keys.map(it => table.column(it));
    columns.forEach(it => {
      if (it.isReference()) this.importEntities.push(it.info.reference!.targetTable);
    });
    const name = columns
      .map(column => (column.isReference() ? column.info.reference!.targetTable : column.name))
      .map(capitalizeFirstLetter)
      .join('And');
    const params = columns.map(it =>
      it.isReference()
        ? `${it.info.reference!.targetTable}: Pick<${capitalizeFirstLetter(it.info.reference!.targetTable)}, '${
            it.info.reference!.targetColumn
          }'>`
        : `${it.name}: ${it.getTsType(true)}`,
    );

    const returns = isUnique() ? `${table.entityName()} | undefined` : `${table.entityName()}[]`;
    const findParamMap = columns.map(it =>
      it.isReference()
        ? `${it.info.reference!.columnName}: ${it.info.reference!.targetTable}.${it.info.reference!.targetColumn}`
        : it.name,
    );
    return createFindFunction(name, params, returns, findParamMap, isUnique());
  };

  private functions = (table: TableGenerator) => {
    // return getFindQueries(table)
    return table
      .getFindQueries()
      .map(it => this.createFindBy(it, table))
      .join('\n');
  };

  createRepositoryString = () => {
    const table = this.table;
    const entity = table.entityName();
    const pKeys = table.primaryKey ? `\n    ${table.primaryKey.map(it => `'${it}'`).join('\n    ')}` : '';
    const functions = this.functions(table);
    return `\
${this.imports.join('\n')}
${[...new Set(this.importEntities)]
  .map(it => `import { ${capitalizeFirstLetter(it)} } from '../entity/${it}';`)
  .join('\n')}

export abstract class Generated${entity}Repository extends SasatRepository<${entity}, Creatable${entity}> {
  protected tableName = '${table.tableName}';
  protected primaryKeys: string[] = [${pKeys}
  ];

${functions}}
`;
  };
}

const createRepository = (tableName: string) => {
  const className = `${capitalizeFirstLetter(tableName)}Repository`;
  return `\
import { Generated${className} } from '../__generated/repository/${tableName}';

export class ${className} extends Generated${className} {}
`;
};

export const writeRepository = async (table: TableGenerator, generateDir: string, repositoryDir: string) => {
  await writeFile(
    path.join(generateDir, table.tableName + '.ts'),
    new RepositoryGenerator(table).createRepositoryString(),
  );
  await writeFileIfNotExists(path.join(repositoryDir, table.tableName + '.ts'), createRepository(table.tableName));
};
