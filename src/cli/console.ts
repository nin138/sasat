import chalk from 'chalk';

export const Console = {
  success: (msg: string) => {
    console.log(chalk.green(msg));
  },
  error: (msg: string) => {
    console.error(chalk.bold.red(msg));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (msg: any) => {
    console.log(msg);
  },
};
