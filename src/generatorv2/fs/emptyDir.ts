import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'path';

export async function emptyDir(dir: string) {
  let items;
  try {
    items = await readdir(dir);
  } catch {
    return mkdir(dir, {
      mode: 0o777,
    });
  }

  return Promise.all(
    items.map(item =>
      rm(path.join(dir, item), {
        recursive: true,
        force: true,
      }),
    ),
  );
}
