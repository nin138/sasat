import { TableInfo } from '../../migration/table/tableInfo';
import * as path from 'path';
import { config } from '../../config/config';
import { camelize, capitalizeFirstLetter, mkDirIfNotExists } from '../../util';
import { emptyDir, writeFile } from 'fs-extra';
import { getEntityName } from '../entity/entity';
import { columnTypeToTsType } from '../../migration/column/columnTypes';

const importStatement = (table: TableInfo) =>
  [
    `import { SasatRepository } from 'sasat';`,
    `import { ${getEntityName(table)}, Creatable${getEntityName(table)} } from '../entity/${table.tableName}';`,
  ].join('\n');

const findByUnique = (table: TableInfo, keys: string[]) => {
  if (keys.length === 0) return '';
  const name = `async ${camelize('findBy' + keys.map(capitalizeFirstLetter).join('And'))}`;
  const params = keys
    .map(it => `${it}: ${columnTypeToTsType(table.columns.find(it => it.columnName)!.type)}`)
    .join(', ');
  const returns = `: Promise<${getEntityName(table)} | undefined>`;
  const lines = [
    'const result = await this.findBy({',
    ...keys.map(it => `  ${it},`),
    '});',
    'if (result.length === 0) return;',
    'return result[0];',
  ];
  return `  ${name}(${params})${returns} {
    ${lines.join('\n    ')}
  }`;
};

const createRepositoryString = (table: TableInfo) => {
  const entity = getEntityName(table);
  const pKeys = table.primaryKey ? `\n    ${table.primaryKey.map(it => `'${it}'`).join('\n    ')}` : '';
  return `${importStatement(table)}

export class ${entity}Repository extends SasatRepository<${entity}, Creatable${entity}> {
  protected tableName = '${table.tableName}';
  protected primaryKeys: string[] = [${pKeys}
  ];

${[table.primaryKey, ...table.uniqueKeys]
  .filter(it => it)
  .map(it => findByUnique(table, it!))
  .join('\n\n')}
}
`;
};

export const writeRepositoryFiles = async (tables: TableInfo[]) => {
  const outDir = path.join(config().migration.out, 'repository');
  mkDirIfNotExists(outDir);
  await emptyDir(outDir);
  return await Promise.all(
    tables.map(table => writeFile(path.join(outDir, table.tableName + '.ts'), createRepositoryString(table))),
  );
};
