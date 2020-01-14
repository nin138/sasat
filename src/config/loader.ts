import * as path from 'path';
import * as fs from 'fs';
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
    };
  }

  getConfig(): SasatConfig {
    return this.conf;
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
