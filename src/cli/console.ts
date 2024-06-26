import chalk from 'chalk';
import * as console from 'console';

export const Console = {
  success: (msg: string): void => {
    console.log(chalk.green(msg));
  },
  error: (msg: string): void => {
    console.error(chalk.bold.red(msg));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (msg: any): void => {
    console.log(msg);
  },
  debug: (msg: string) => {
    console.debug('debug:: ' + msg);
  },
};
