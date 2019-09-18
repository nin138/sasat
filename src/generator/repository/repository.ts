import { TableInfo } from "../../migration/table/tableInfo";
import * as path from "path";
import { config } from "../../config/config";
import { mkDirIfNotExists } from "../../util";
import { emptyDir, writeFile } from "fs-extra";
import { getEntityName } from "../entity/entity";

const createRepositoryString = (table: TableInfo) => {
  const entity = getEntityName(table);
  const pKeys = table.primaryKey ? `\n    ${table.primaryKey.map(it => `'${it}'`).join("\n    ")}` : "";
  return `import { Repository } from 'sasat';
import { ${entity}, Creatable${entity} } from '../entity/${table.tableName}';
export class ${entity}Repository extends Repository<${entity}, Creatable${entity}> {
  readonly tableName = '${table.tableName}';
  protected primaryKeys: string[] = [${pKeys}
  ];
}
`;
};

export const writeRepositoryFiles = async (tables: TableInfo[]) => {
  const outDir = path.join(config.migration.out, "repository");
  mkDirIfNotExists(outDir);
  await emptyDir(outDir);
  return await Promise.all(
    tables.map(table => writeFile(path.join(outDir, table.tableName + ".ts"), createRepositoryString(table))),
  );
};
