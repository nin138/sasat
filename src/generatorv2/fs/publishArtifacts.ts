import fs from "node:fs";
import path from "node:path";

export type FileArtifact = { path: string; content: string };
export type DirectoryArtifact = { path: string; files: FileArtifact[] };
type Artifact = FileArtifact | DirectoryArtifact;

function stat(target: string) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

/** Publish prepared artifacts, restoring old paths on ordinary filesystem errors.
 * This is not a crash-safe or concurrent-writer transaction.
 */
export function publishArtifacts(artifacts: Artifact[]): void {
  const targets = artifacts.map((artifact) => path.resolve(artifact.path));
  for (let i = 0; i < targets.length; i++) {
    for (let j = 0; j < i; j++) {
      const relative = path.relative(targets[j], targets[i]);
      const reverse = path.relative(targets[i], targets[j]);
      if (
        relative === "" ||
        (!relative.startsWith(`..${path.sep}`) &&
          relative !== ".." &&
          !path.isAbsolute(relative)) ||
        (!reverse.startsWith(`..${path.sep}`) &&
          reverse !== ".." &&
          !path.isAbsolute(reverse))
      )
        throw new Error(
          `Overlapping generation targets: ${targets[j]}, ${targets[i]}`,
        );
    }
  }
  const createdDirs: string[] = [];
  const entries: {
    target: string;
    temp: string;
    staged: string;
    backup: string;
    backedUp: boolean;
    published: boolean;
    retain: boolean;
  }[] = [];
  const mkdir = (dir: string): void => {
    if (fs.existsSync(dir)) return;
    mkdir(path.dirname(dir));
    fs.mkdirSync(dir);
    createdDirs.push(dir);
  };
  const preserveMode = (previous: string, next: string, directory: boolean) => {
    const previousStat = stat(previous);
    if (!previousStat) return;
    if (
      previousStat.isSymbolicLink() ||
      previousStat.isDirectory() !== directory ||
      (!directory && !previousStat.isFile())
    ) {
      throw new Error(`Unsupported generation target: ${previous}`);
    }
    fs.chmodSync(next, previousStat.mode & 0o7777);
  };
  let committed = false;
  try {
    for (const [index, artifact] of artifacts.entries()) {
      const target = targets[index];
      mkdir(path.dirname(target));
      const temp = fs.mkdtempSync(
        path.join(path.dirname(target), ".sasat-codegen-"),
      );
      const entry = {
        target,
        temp,
        staged: path.join(temp, "next"),
        backup: path.join(temp, "previous"),
        backedUp: false,
        published: false,
        retain: false,
      };
      entries.push(entry);
      if ("content" in artifact) {
        fs.writeFileSync(entry.staged, artifact.content);
        preserveMode(target, entry.staged, false);
      } else {
        fs.mkdirSync(entry.staged);
        const directories = new Set([entry.staged]);
        const names = new Set<string>();
        for (const file of artifact.files) {
          const next = path.resolve(entry.staged, file.path);
          const relative = path.relative(entry.staged, next);
          if (
            !relative ||
            relative === ".." ||
            relative.startsWith(`..${path.sep}`) ||
            path.isAbsolute(relative) ||
            names.has(next)
          ) {
            throw new Error(`Invalid generated file path: ${file.path}`);
          }
          names.add(next);
          let dir = path.dirname(next);
          while (dir !== entry.staged) {
            directories.add(dir);
            dir = path.dirname(dir);
          }
          fs.mkdirSync(path.dirname(next), { recursive: true });
          fs.writeFileSync(next, file.content);
          preserveMode(path.join(target, relative), next, false);
        }
        // Apply directory modes after writing children (directories may be read-only).
        for (const dir of [...directories].sort(
          (a, b) => b.length - a.length,
        )) {
          preserveMode(
            path.join(target, path.relative(entry.staged, dir)),
            dir,
            true,
          );
        }
      }
    }
    for (const entry of entries) {
      if (stat(entry.target)) {
        fs.renameSync(entry.target, entry.backup);
        entry.backedUp = true;
      }
      fs.renameSync(entry.staged, entry.target);
      entry.published = true;
    }
    committed = true;
  } catch (error) {
    const errors: unknown[] = [error];
    for (const entry of [...entries].reverse()) {
      try {
        if (entry.published) fs.renameSync(entry.target, entry.staged);
        if (entry.backedUp) fs.renameSync(entry.backup, entry.target);
      } catch (recoveryError) {
        entry.retain = true;
        errors.push(
          new Error(
            `Generation rollback failed; recovery files retained at ${entry.temp}`,
            { cause: recoveryError },
          ),
        );
      }
    }
    if (errors.length > 1)
      throw new AggregateError(
        errors,
        `Generation failed and rollback was incomplete; recovery files retained at ${entries
          .filter((entry) => entry.retain)
          .map((entry) => entry.temp)
          .join(", ")}`,
      );
    throw error;
  } finally {
    for (const entry of entries) {
      if (entry.retain) continue;
      try {
        fs.rmSync(entry.temp, { recursive: true, force: true });
      } catch {
        // A cleanup failure must not report a successfully published generation as failed.
        console.warn(
          `[sasat] Could not remove generation temporary directory: ${entry.temp}`,
        );
      }
    }
    if (!committed) {
      for (const dir of createdDirs.reverse()) {
        try {
          fs.rmdirSync(dir);
        } catch {
          /* Keep nonempty directories and recovery files. */
        }
      }
    }
  }
}
