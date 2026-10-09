import { existsSync } from "node:fs";
import path from "node:path";
import { readYmlFile } from "../util/fsUtil.js";
import {
  defaultConf,
  type MigrationBuildConfig,
  type SasatConfig,
} from "./config.js";
import {
  invalidConfig,
  mergeConfig,
  readConfigFields,
  readMigrationBuildConfig,
} from "./validate.js";

export class SasatConfigLoader {
  static getFields<T>(fields: readonly string[]): T {
    return readConfigFields(
      defaultConf,
      SasatConfigLoader.loadConfig(),
      fields,
      true,
    ) as T;
  }
  static getMigrationBuildConfig(): MigrationBuildConfig {
    return readMigrationBuildConfig(
      SasatConfigLoader.loadConfig(),
      defaultConf.migration.dir,
    );
  }

  private static loadConfig(): unknown {
    const filepath = path.join(process.cwd(), "sasat.yml");
    if (!existsSync(filepath)) return {};
    try {
      const value: unknown = readYmlFile(filepath);
      return value === undefined ? {} : value;
    } catch {
      // YAML errors can contain source snippets, including passwords and CA data.
      throw invalidConfig("sasat.yml", "could not be read or parsed");
    }
  }

  readonly conf: SasatConfig;

  constructor() {
    this.conf = mergeConfig(defaultConf, SasatConfigLoader.loadConfig(), true);
  }

  getConfig(): SasatConfig {
    return this.conf;
  }
}
