import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

export async function emptyDir(dir: string) {
  let items: string[];
  try {
    items = await readdir(dir);
  } catch {
    return mkdir(dir, {
      mode: 0o777,
      recursive: true,
    });
  }

  return Promise.all(
    items.map((item) =>
      rm(path.join(dir, item), {
        recursive: true,
        force: true,
      }),
    ),
  );
}
