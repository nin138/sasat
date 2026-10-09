import fs from "node:fs";
import path from "node:path";
import { getMigrationDirectory } from "@/config/config.js";

export const getMigrationFileDir = () => {
  return path.join(process.cwd(), getMigrationDirectory());
};

export const getMigrationFileNames = (
  directory = getMigrationFileDir(),
): string[] => {
  return fs
    .readdirSync(directory)
    .filter((it) => it.split(".").pop() === "ts")
    .sort();
};
