import { writeYmlFile } from '../../util/fsUtil.js';
import { defaultConf } from '../../config/config.js';
import { Console } from '../console.js';
import * as fs from 'fs';

export const init = (): void => {
  if (fs.existsSync('./sasat.yml')) {
    Console.error('sasat.yml already exist');
    return;
  }
  writeYmlFile('./', 'sasat.yml', defaultConf);
  Console.success('sasat.yml created');
};
