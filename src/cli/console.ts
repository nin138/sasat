import * as chalk from 'chalk';

export const Console = {
  success: (msg: string): void => {
    console.log(chalk.green(msg));
  },
  error: (msg: string): void => {
    console.error(chalk.bold.red(msg));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
  log: (msg: any): void => {
    console.log(msg);
  },
};
