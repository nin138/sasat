import { config } from "../../config/config.js";
import { Direction } from "./getCurrentMigration.js";

/** Resolve before compilation or generation can write any files. */
export const resolveMigrationTarget = (
  files: string[],
  target: string | undefined = config().migration.target,
): string | undefined => {
  if (target !== undefined && !files.includes(target))
    throw new Error("migration target not found");
  return target ?? files[files.length - 1];
};

export const getMigrationTargets = (
  files: string[],
  current: string | undefined,
): { direction: Direction; files: string[] } => {
  const currentIndex = current ? files.indexOf(current) + 1 : 0;
  const targetIndex = files.indexOf(resolveMigrationTarget(files) ?? "") + 1;
  if (current !== undefined && !files.includes(current))
    throw new Error("migration target not found");
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
