import fs from "node:fs";
import path from "node:path";
import { getMigrationBuildConfig } from "@/config/config.js";

export const getMigrationFileDir = () => {
  return path.join(process.cwd(), getMigrationBuildConfig().dir);
};

export const getMigrationFileNames = (
  directory = getMigrationFileDir(),
): string[] => {
  return fs
    .readdirSync(directory)
    .filter((it) => it.split(".").pop() === "ts")
    .sort();
};
