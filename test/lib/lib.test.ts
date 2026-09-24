import { describe, it, expect } from 'vitest';
import { parseAppleScriptJson, JSON_ESCAPE_APPLESCRIPT, DefaultAppleScriptRunner } from '../../src/lib/applescript.js';
import { normalizeError, ThingsNotInstalledError, ThingsPermissionError, ThingsNotFoundError } from '../../src/lib/errors.js';
import { buildThingsAddUrl, buildThingsJsonUrl, buildThingsUpdateUrl } from '../../src/lib/thingsUrl.js';

describe('applescript lib', () => {
  it('parses valid JSON from AppleScript output', () => {
    const raw = '[{"id":"123","name":"Test"}]';
    const parsed = parseAppleScriptJson<{ id: string; name: string }[]>(raw);
    expect(parsed).toEqual([{ id: '123', name: 'Test' }]);
  });

  it('handles missing value or null', () => {
    expect(parseAppleScriptJson('missing value')).toBeNull();
    expect(parseAppleScriptJson('null')).toBeNull();
    expect(parseAppleScriptJson('')).toBeNull();
  });

  it('correctly escapes special characters in jsonEscape AppleScript function', async () => {
    const runner = new DefaultAppleScriptRunner();
    const testScript = `
on run argv
  set quoteChar to character id 34
  set slashChar to character id 92
  set lineFeedChar to character id 10
  set testStr to "hello " & quoteChar & "world" & quoteChar & " " & slashChar & " backslash and " & lineFeedChar & "newline"
  return my jsonEscape(testStr)
end run
` + JSON_ESCAPE_APPLESCRIPT;

    const res = await runner.execute(testScript);
    expect(JSON.parse(res)).toBe('hello "world" \\ backslash and \nnewline');
  });
});

describe('errors lib', () => {
  it('normalizes permission error code -1743', () => {
    const err = normalizeError(new Error('execution error: Not authorized to send Apple events (-1743)'));
    expect(err).toBeInstanceOf(ThingsPermissionError);
    expect(err.code).toBe('PERMISSION_DENIED');
  });

  it('normalizes not installed / app not found errors', () => {
    const err = normalizeError(new Error('execution error: Application isn’t running. (-600)'));
    expect(err).toBeInstanceOf(ThingsNotInstalledError);
    expect(err.code).toBe('THINGS_NOT_INSTALLED');
  });

  it('normalizes item not found error -1728', () => {
    const err = normalizeError(new Error('execution error: Can’t get to do id "xyz" (-1728)'));
    expect(err).toBeInstanceOf(ThingsNotFoundError);
    expect(err.code).toBe('NOT_FOUND');
  });
});

describe('thingsUrl lib', () => {
  it('builds a proper things:///add url with parameters', () => {
    const url = buildThingsAddUrl({
      title: 'Buy milk',
      notes: 'Remember 2%',
      when: 'today',
      deadline: '2026-10-01',
      list: 'Home',
      tags: ['groceries', 'errands'],
      checklistItems: ['Almond milk', 'Oat milk'],
    });

    expect(url).toContain('things:///add?');
    expect(url).toContain('title=Buy+milk');
    expect(url).toContain('notes=Remember+2%25');
    expect(url).toContain('when=today');
    expect(url).toContain('deadline=2026-10-01');
    expect(url).toContain('list=Home');
    expect(url).toContain('tags=groceries%2Cerrands');
    expect(url).toContain('checklist-items=Almond+milk%0AOat+milk');
  });

  it('builds an authenticated Things checklist update URL', () => {
    const url = buildThingsUpdateUrl({
      id: 'todo-id',
      authToken: 'test-token',
      checklistMode: 'append',
      checklistItems: ['Cheese', 'Bread'],
    });

    expect(url).toContain('things:///update?');
    expect(url).toContain('id=todo-id');
    expect(url).toContain('auth-token=test-token');
    expect(url).toContain('append-checklist-items=Cheese%0ABread');
  });

  it('builds a JSON URL for ordered project structures', () => {
    const url = buildThingsJsonUrl([
      {
        type: 'project',
        attributes: {
          title: 'Release',
          items: [
            { type: 'heading', attributes: { title: 'RFQA' } },
            { type: 'to-do', attributes: { title: 'Check ticket' } },
          ],
        },
      },
    ]);

    const data = new URL(url).searchParams.get('data');
    expect(data).not.toBeNull();
    expect(JSON.parse(data!)[0].attributes.items.map((item: { type: string }) => item.type)).toEqual(['heading', 'to-do']);
  });
});
