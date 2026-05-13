import { existsSync } from 'node:fs';
import path from 'node:path';
import { readYmlFile } from '../util/fsUtil.js';
import {
  defaultConf,
  type PartialSasatConfig,
  type SasatConfig,
} from './config.js';

export class SasatConfigLoader {
  private static loadConfig(): PartialSasatConfig {
    const fileName = 'sasat.yml';
    const filepath = path.join(process.cwd(), fileName);
    if (!existsSync(filepath)) return defaultConf;
    return readYmlFile(filepath);
  }

  readonly conf: SasatConfig;

  constructor() {
    const conf: SasatConfig = this.readValue({
      ...defaultConf,
      ...SasatConfigLoader.loadConfig(),
    });
    this.conf = {
      ...conf,
    };
  }

  getConfig(): SasatConfig {
    return this.conf;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readValue(value: any): any {
    if (!value) return value;
    if (Array.isArray(value)) return value.map(it => this.readValue(it));
    if (typeof value === 'string' && value.startsWith('$'))
      return process.env[value.slice(1)];
    if (typeof value === 'object') {
      for (const key in value) {
        if (Object.hasOwn(value, key)) value[key] = this.readValue(value[key]);
      }
      return value;
    }
    return value;
  }
}
