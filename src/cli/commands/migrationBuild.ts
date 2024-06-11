import { Console } from '../console.js';
import { compileMigrationFiles } from '../../migration/exec/migrationFileCompiler.js';

export const migrationBuild = async (): Promise<void> => {
  Console.log('--migration build started--');
  await compileMigrationFiles();
  Console.success('Done!');
};
