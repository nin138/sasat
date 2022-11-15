import { config } from '../../config/config.js';
import { Direction } from './getCurrentMigration.js';

export const getMigrationTargets = (
  files: string[],
  current: string | undefined,
): { direction: Direction; files: string[] } => {
  const currentIndex = current ? files.indexOf(current) + 1 : 0;
  const targetIndex =
    files.indexOf(config().migration.target || files[files.length - 1]) + 1;
  if (currentIndex === -1 || targetIndex === -1)
    throw new Error('migration target not found');
  if (targetIndex >= currentIndex)
    return {
      direction: Direction.Up,
      files: files.slice(currentIndex, targetIndex),
    };
  return {
    direction: Direction.Down,
    files: files.slice(targetIndex, currentIndex).reverse(),
  };
};
