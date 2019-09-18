import * as fs from "fs";
import { join } from "path";
import { config } from "../config/config";
import { capitalizeFirstLetter } from "../util";

export const createMigrationFile = (migrationName: string) => {
  const date = new Date();
  const pad = (val: number) => val.toString().padStart(2, "0");
  const now =
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    `_` +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds());
  const fileName = now + migrationName;
  fs.writeFileSync(join(config.migration.dir, fileName) + ".ts", getMigrationFile(migrationName));
  return fileName;
};

const getMigrationFile = (className: string) =>
  `import { SasatMigration } from "sasat";
import { DataStoreBuilder } from "sasat";

export class ${capitalizeFirstLetter(className)} implements SasatMigration {
  up: (store: DataStoreBuilder) => void = store => {

  }
}

`;
