import { writeYmlFile } from "../util";
import { config } from "../config/config";
import { TableInfo } from "../migration/table/tableInfo";
import { writeEntityFiles } from "./entity/entity";
import { writeRepositoryFiles } from "./repository/repository";

export const generate = async (tables: TableInfo[]) => {
  writeYmlFile(config.migration.out, "current_schema.yml", tables);
  await writeEntityFiles(tables);
  await writeRepositoryFiles(tables);
};
