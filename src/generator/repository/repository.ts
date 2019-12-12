import * as path from 'path';
import { writeFile } from 'fs-extra';
import { TableGenerator } from '../store';
import { columnTypeToTsType, SasatColumnTypes } from '../../migration/column/columnTypes';
import { camelize, capitalizeFirstLetter } from '../../util/stringUtil';
import { writeFileIfNotExists } from '../../util/fsUtil';

export interface Import {
  name: string[];
  path: string;
}

export interface FindQueryCreatable {
  params: Array<{ name: string; type: SasatColumnTypes }>;
  returnEntity: string;
  isReturnUnique: boolean;
}

export class FindQueryCreator implements FindQueryCreatable {
  params: Array<{ name: string; type: SasatColumnTypes }>;
  returnEntity: string;
  isReturnUnique: boolean;
  constructor(creatable: FindQueryCreatable) {
    this.params = creatable.params;
    this.returnEntity = creatable.returnEntity;
    this.isReturnUnique = creatable.isReturnUnique;
  }
  private fnName = (): string => {
    return (
      'findBy' +
      this.params
        .map(it => it.name)
        .map(camelize)
        .map(capitalizeFirstLetter)
        .join('And')
    );
  };

  toTsFn = () => {
    const returnType = this.isReturnUnique ? `${this.returnEntity} | undefined` : `${this.returnEntity}[]`;
    const whereClause = this.params.map(it => it.name);
    return `\
  async ${this.fnName()}(${this.params
      .map(it => `${it.name}: ${columnTypeToTsType(it.type)}`)
      .join(', ')}): Promise<${returnType}> {
    const result = await this.find({
      where: {
        ${whereClause.join(',\n        ')},
      }
    });
    ${this.isReturnUnique ? `if (result.length === 0) return;\n    return result[0];` : 'return result;'}
  }
`;
  };
}

export interface RepositoryCreatable {
  entityName: string;
  findQueries: FindQueryCreator[];
}

export const toRepoFnName = (keys: string[], table: TableGenerator) => {
  return keys
    .map(it => table.column(it).name)
    .map(camelize)
    .map(capitalizeFirstLetter)
    .join('And');
};

export class RepositoryGenerator {
  private imports: string[] = ["import { SasatRepository } from 'sasat';"];
  private importEntities: string[] = [];
  constructor(private table: TableGenerator) {
    this.imports.push(
      `import { ${table.entityName()}, Creatable${table.entityName()} } from '../entity/${table.tableName}';`,
    );
  }

  private functions = (table: TableGenerator) => {
    // return getFindQueries(table)
    return table
      .getFindQueries()
      .map(it => it.toTsFn())
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
