import fs from "node:fs";
import path from "node:path";
import { config } from "@/config/config.js";

export const getMigrationFileDir = () => {
  return path.join(process.cwd(), config().migration.dir);
};

export const getMigrationFileNames = (): string[] => {
  return fs
    .readdirSync(getMigrationFileDir())
    .filter((it) => it.split(".").pop() === "ts");
};
