import chalk from "chalk";

export const Console = {
  success: (msg: string): void => {
    console.log(chalk.green(msg));
  },
  error: (msg: string): void => {
    console.error(chalk.bold.red(msg));
  },
  // biome-ignore lint/suspicious/noExplicitAny: <>
  log: (msg: any): void => {
    console.log(msg);
  },
  debug: (msg: string) => {
    console.debug("debug:: " + msg);
  },
};
