import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isMainModule(moduleUrl: string, entryPath = process.argv[1]): boolean {
  if (!entryPath) {
    return false;
  }

  try {
    return realpathSync(entryPath) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}
