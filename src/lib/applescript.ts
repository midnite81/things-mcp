import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { normalizeError, ThingsError } from './errors.js';

const execFileAsync = promisify(execFile);

export interface AppleScriptRunner {
  execute(script: string, args?: string[]): Promise<string>;
}

export class DefaultAppleScriptRunner implements AppleScriptRunner {
  private readonly osascriptPath: string;

  constructor(osascriptPath: string = '/usr/bin/osascript') {
    this.osascriptPath = osascriptPath;
  }

  async execute(script: string, args: string[] = []): Promise<string> {
    try {
      // osascript -e <script> arg1 arg2 ...
      const { stdout } = await execFileAsync(this.osascriptPath, ['-e', script, ...args], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (error: any) {
      // In case osascript wrote to stderr or returned non-zero code
      const stderr = error?.stderr ? String(error.stderr).trim() : '';
      const message = stderr || (error instanceof Error ? error.message : String(error));
      throw normalizeError(new Error(message));
    }
  }
}

export const defaultAppleScriptRunner = new DefaultAppleScriptRunner();

export const JSON_ESCAPE_APPLESCRIPT = `
on jsonEscape(strVal)
  set quoteChar to character id 34
  set slashChar to character id 92
  set lineFeedChar to character id 10
  set returnChar to character id 13
  set tabChar to character id 9
  if strVal is missing value then
    return quoteChar & quoteChar
  end if
  set s to strVal as text
  set escapedText to ""
  repeat with charRef in characters of s
    set currentChar to contents of charRef
    if currentChar is slashChar then
      set escapedText to escapedText & slashChar & slashChar
    else if currentChar is quoteChar then
      set escapedText to escapedText & slashChar & quoteChar
    else if currentChar is lineFeedChar then
      set escapedText to escapedText & slashChar & "n"
    else if currentChar is returnChar then
      set escapedText to escapedText & slashChar & "r"
    else if currentChar is tabChar then
      set escapedText to escapedText & slashChar & "t"
    else
      set escapedText to escapedText & currentChar
    end if
  end repeat

  return quoteChar & escapedText & quoteChar
end jsonEscape
`;

export async function runAppleScript(
  script: string,
  args: string[] = [],
  runner: AppleScriptRunner = defaultAppleScriptRunner
): Promise<string> {
  return runner.execute(script, args);
}

/**
 * Parses raw JSON string returned by AppleScript.
 */
export function parseAppleScriptJson<T>(raw: string): T {
  if (!raw || raw === 'missing value' || raw === 'null') {
    return null as unknown as T;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new ThingsError(`Failed to parse response from Things: ${raw}`);
  }
}
