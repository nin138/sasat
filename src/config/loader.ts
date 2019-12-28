import * as path from 'path';
import * as fs from 'fs';
import { SasatRedisCacheType } from '../sasat/redisCacheConf';
import { defaultConf, PartialSasatConfig, SasatConfig } from './config';
import { readYmlFile } from '../util/fsUtil';

export class SasatConfigLoader {
  private static loadFile(): PartialSasatConfig {
    const fileName = 'sasat.yml';
    const filepath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filepath)) throw new Error(`${fileName} not Found in Project root folder`);
    return readYmlFile(filepath);
  }

  readonly conf: SasatConfig;

  constructor() {
    const conf: SasatConfig = this.readValue({ ...defaultConf, ...SasatConfigLoader.loadFile() });
    this.conf = {
      ...conf,
      initCaches: this.readCacheConf(conf.initCaches),
    };
  }

  getConfig(): SasatConfig {
    return this.conf;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readCacheConf(conf: { [key: string]: any }): SasatRedisCacheType[] {
    if (typeof conf !== 'object') return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.entries(conf).map(([key, value]: any, index) => {
      return {
        name: key,
        type: value.type.toLowerCase(),
        keyPrefix: value.keyPrefix || `${index}__`,
        isKeyAutoIncrement: value.key_auto_increment,
        ...value,
      };
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readValue(value: any): any {
    if (!value) return value;
    if (Array.isArray(value)) return value.map(it => this.readValue(it));
    if (typeof value === 'string' && value.startsWith('$')) return process.env[value.slice(1)];
    if (typeof value === 'object') {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) value[key] = this.readValue(value[key]);
      }
      return value;
    }
    return value;
  }
}
