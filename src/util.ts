import * as yaml from "js-yaml";
import * as fs from "fs-extra";
import { join } from "path";

export const readYmlFile = (filepath: string) => yaml.safeLoad(fs.readFileSync(filepath, "utf8"));

export const writeYmlFile = (path: string, fileName: string, obj: any) => {
  if (!fs.pathExistsSync(path)) fs.mkdirpSync(path);
  fs.writeFileSync(join(path, fileName), yaml.safeDump(obj, { skipInvalid: true }));
};

export const capitalizeFirstLetter = (str: string): string => str.slice(0, 1).toUpperCase() + str.slice(1);
