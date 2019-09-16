import chalk from "chalk";

export const Console = {
  success: (msg: string) => {
    console.log(chalk.green(msg));
  },
  error: (msg: string) => {
    console.error(chalk.bold.red(msg));
  },
  log: (msg: any) => {
    console.log(msg);
  },
};
