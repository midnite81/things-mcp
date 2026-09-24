import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isMainModule } from '../../src/lib/isMainModule.js';

describe('isMainModule', () => {
  it('recognises the entry point when invoked through a symlink', () => {
    const directory = mkdtempSync(join(tmpdir(), 'things-mcp-main-module-'));
    const symlinkPath = join(directory, 'things-mcp');

    try {
      symlinkSync(new URL(import.meta.url), symlinkPath);

      expect(isMainModule(import.meta.url, symlinkPath)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('returns false when there is no entry path or it does not resolve', () => {
    expect(isMainModule(import.meta.url, undefined)).toBe(false);
    expect(isMainModule(import.meta.url, join(tmpdir(), 'missing-things-mcp-entry'))).toBe(false);
  });
});
