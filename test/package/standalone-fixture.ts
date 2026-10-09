import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();

/** Simulates an installed application with only its selected database driver. */
export function standaloneFixture(
  directory: string,
  dialect: "mysql" | "postgres",
) {
  const manifest = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  );
  const modules = path.join(directory, "node_modules");
  const sasat = path.join(modules, "sasat");
  mkdirSync(sasat, { recursive: true });
  cpSync(path.join(root, "dist"), path.join(sasat, "dist"), {
    recursive: true,
  });
  writeFileSync(path.join(sasat, "package.json"), JSON.stringify(manifest));
  for (const dependency of [
    ...Object.keys(manifest.dependencies),
    dialect === "mysql" ? "mysql2" : "pg",
  ]) {
    symlinkSync(
      path.join(root, "node_modules", dependency),
      path.join(modules, dependency),
    );
  }
  mkdirSync(path.join(directory, "migrations"));
  writeFileSync(
    path.join(directory, "sasat.yml"),
    JSON.stringify({
      db: {
        dialect,
        host: "$STANDALONE_UNDEFINED",
        password: "BUILD_SECRET_MUST_NOT_BE_EMBEDDED",
      },
      migration: { dir: "migrations" },
      generator: "$STANDALONE_UNDEFINED",
      testDB: "$STANDALONE_UNDEFINED",
    }),
  );
  const env = { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" };
  delete (env as NodeJS.ProcessEnv).STANDALONE_UNDEFINED;
  return (...options: string[]) =>
    spawnSync(
      process.execPath,
      [
        path.join(sasat, "dist/cli/index.mjs"),
        "migration:build",
        "--standalone",
        ...options,
      ],
      { cwd: directory, encoding: "utf8", timeout: 30000, env },
    );
}
