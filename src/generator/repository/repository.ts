import { TableInfo } from '../../migration/table/tableInfo';
import * as path from 'path';
import { config } from '../../config/config';
import { camelize, capitalizeFirstLetter, mkDirIfNotExists } from '../../util';
import { emptyDir, writeFile } from 'fs-extra';
import { getEntityName } from '../entity/entity';
import { columnTypeToTsType } from '../../migration/column/columnTypes';
import { ReferenceColumnInfo } from '../../migration/column/referenceColumn';

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
  constructor(private table: TableInfo) {
    this.imports.push(
      `import { ${getEntityName(table)}, Creatable${getEntityName(table)} } from '../entity/${table.tableName}';`,
    );
  }

  private createFindBy = (
    table: TableInfo,
    keys: string[],
    unique: boolean,
    ref?: Pick<ReferenceColumnInfo, 'table' | 'column'>,
  ) => {
    if (keys.length === 0) return '';
    const name = ref !== undefined ? ref!.table : keys.map(capitalizeFirstLetter).join('And');
    let params;
    if (ref !== undefined) {
      this.imports.push(`import { ${capitalizeFirstLetter(ref.table)} } from '../entity/${ref.table}';`);
      params = [`${ref.table}: Pick<${capitalizeFirstLetter(ref.table)}, '${ref.column}'>`];
    } else {
      params = keys.map(it => `${it}: ${columnTypeToTsType(table.columns.find(it => it.columnName)!.type)}`);
    }
    const returns = unique ? `${getEntityName(table)} | undefined` : `${getEntityName(table)}[]`;
    const findParamMap = ref !== undefined ? [`${ref.column}: ${ref.table}.${ref.column}`] : keys;
    return createFindFunction(name, params, returns, findParamMap, unique);
  };

  private functions = (table: TableInfo) => {
    const functions: Array<{
      keys: string[];
      unique: boolean;
      ref?: Pick<ReferenceColumnInfo, 'table' | 'column'>;
    }> = [];
    const isDuplicate = (keys: string[]) => {
      outer: for (const fn of functions) {
        if (keys.length !== fn.keys.length) continue;
        for (const [i, it] of keys.entries()) {
          if (it !== fn.keys[i]) continue outer;
        }
        return true;
      }
      return false;
    };

    if (table.primaryKey) functions.push({ keys: table.primaryKey, unique: true });
    functions.push(
      ...table.references
        .filter(it => !isDuplicate([it.column]))
        .map(it => ({ keys: [it.column], unique: it.unique, ref: { table: it.table, column: it.column } })),
    );
    functions.push(
      ...table.uniqueKeys.filter(it => !isDuplicate(it)).map(it => ({ keys: it, unique: true, isRef: false })),
    );
    return functions.map(it => this.createFindBy(table, it.keys, it.unique, it.ref)).join('\n');
  };
  createRepositoryString = () => {
    const table = this.table;
    const entity = getEntityName(table);
    const pKeys = table.primaryKey ? `\n    ${table.primaryKey.map(it => `'${it}'`).join('\n    ')}` : '';
    const functions = this.functions(table);
    return `\
${this.imports.join('\n')}

export class ${entity}Repository extends SasatRepository<${entity}, Creatable${entity}> {
  protected tableName = '${table.tableName}';
  protected primaryKeys: string[] = [${pKeys}
  ];

${functions}}
`;
  };
}

export const writeRepositoryFiles = async (tables: TableInfo[]) => {
  const outDir = path.join(config().migration.out, 'repository');
  mkDirIfNotExists(outDir);
  await emptyDir(outDir);
  return await Promise.all(
    tables.map(table =>
      writeFile(path.join(outDir, table.tableName + '.ts'), new RepositoryGenerator(table).createRepositoryString()),
    ),
  );
};
