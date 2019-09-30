import { TableInfo } from '../../migration/table/tableInfo';
import * as path from 'path';
import { camelize, capitalizeFirstLetter, writeFileIfNotExists } from '../../util';
import { writeFile } from 'fs-extra';
import { getEntityName } from '../entity/entity';
import { columnTypeToTsType } from '../../migration/column/columnTypes';
import { ReferenceColumnInfo } from '../../migration/column/referenceColumn';
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
  constructor(private table: TableGenerator) {
    this.imports.push(
      `import { ${table.entityName()}, Creatable${table.entityName()} } from '../entity/${table.tableName}';`,
    );
  }

  private createFindBy = (
    table: TableGenerator,
    keys: string[],
    unique: boolean,
    ref?: Pick<ReferenceColumnInfo, 'targetTable' | 'targetColumn'>,
  ) => {
    if (keys.length === 0) return '';
    const name = ref !== undefined ? ref!.targetTable : keys.map(capitalizeFirstLetter).join('And');
    let params;
    if (ref !== undefined) {
      this.imports.push(`import { ${capitalizeFirstLetter(ref.targetTable)} } from '../entity/${ref.targetTable}';`);
      params = [`${ref.targetTable}: Pick<${capitalizeFirstLetter(ref.targetTable)}, '${ref.targetColumn}'>`];
    } else {
      params = keys.map(it => `${it}: ${table.column(it).getTsType(true)}`);
    }
    const returns = unique ? `${table.entityName()} | undefined` : `${table.entityName()}[]`;
    const findParamMap = ref !== undefined ? [`${ref.targetColumn}: ${ref.targetTable}.${ref.targetColumn}`] : keys;
    return createFindFunction(name, params, returns, findParamMap, unique);
  };

  private functions = (table: TableGenerator) => {
    return getFindQueries(table)
      .map(it => this.createFindBy(table, it.keys, it.unique, it.ref))
      .join('\n');
  };

  createRepositoryString = () => {
    const table = this.table;
    const entity = table.entityName();
    const pKeys = table.primaryKey ? `\n    ${table.primaryKey.map(it => `'${it}'`).join('\n    ')}` : '';
    const functions = this.functions(table);
    return `\
${this.imports.join('\n')}

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
