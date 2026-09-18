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
  if strVal is missing value then
    return "\\\"\\\""
  end if
  set s to strVal as text
  set AppleScript's text item delimiters to "\\\\"
  set parts to text items of s
  set AppleScript's text item delimiters to "\\\\\\\\"
  set s to parts as text

  set AppleScript's text item delimiters to "\\\""
  set parts to text items of s
  set AppleScript's text item delimiters to "\\\\\\\""
  set s to parts as text

  set AppleScript's text item delimiters to (ASCII character 10)
  set parts to text items of s
  set AppleScript's text item delimiters to "\\\\n"
  set s to parts as text

  set AppleScript's text item delimiters to (ASCII character 13)
  set parts to text items of s
  set AppleScript's text item delimiters to "\\\\r"
  set s to parts as text

  set AppleScript's text item delimiters to (ASCII character 9)
  set parts to text items of s
  set AppleScript's text item delimiters to "\\\\t"
  set s to parts as text

  return "\\\"" & s & "\\\""
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
