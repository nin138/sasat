import fs from "node:fs";
import path from "node:path";
import { getMigrationDirectory } from "@/config/config.js";

export const getMigrationFileDir = () => {
  return path.resolve(process.cwd(), getMigrationDirectory());
};

export const getMigrationFileNames = (
  directory = getMigrationFileDir(),
): string[] => {
  return fs
    .readdirSync(directory)
    .filter(
      (name) =>
        name.endsWith(".ts") &&
        !name.endsWith(".d.ts") &&
        fs.statSync(path.join(directory, name)).isFile(),
    )
    .sort();
};
