export class ThingsError extends Error {
  constructor(message: string, public readonly code: string = 'THINGS_ERROR') {
    super(message);
    this.name = 'ThingsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ThingsNotInstalledError extends ThingsError {
  constructor(message: string = 'Things 3 is not installed or could not be found.') {
    super(message, 'THINGS_NOT_INSTALLED');
    this.name = 'ThingsNotInstalledError';
  }
}

export class ThingsPermissionError extends ThingsError {
  constructor(
    message: string = 'macOS Automation permission for Things 3 has not been granted. Please enable it in System Settings > Privacy & Security > Automation.'
  ) {
    super(message, 'PERMISSION_DENIED');
    this.name = 'ThingsPermissionError';
  }
}

export class ThingsNotFoundError extends ThingsError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'ThingsNotFoundError';
  }
}

export class ThingsInvalidInputError extends ThingsError {
  constructor(message: string) {
    super(message, 'INVALID_INPUT');
    this.name = 'ThingsInvalidInputError';
  }
}

export class ThingsExecutionError extends ThingsError {
  constructor(message: string, public readonly rawError?: unknown) {
    super(message, 'EXECUTION_ERROR');
    this.name = 'ThingsExecutionError';
  }
}

export class ThingsUnsupportedError extends ThingsError {
  constructor(message: string) {
    super(message, 'UNSUPPORTED_OPERATION');
    this.name = 'ThingsUnsupportedError';
  }
}

export function normalizeError(err: unknown): ThingsError {
  if (err instanceof ThingsError) {
    return err;
  }

  const message = err instanceof Error ? err.message : String(err);

  // Check for common macOS / AppleScript permission / app missing error codes
  // -1743: User did not grant automation permissions
  // -1728: Application isn't running or item not found
  // -600: Application isn't running / not installed
  // -1708: Event not handled
  if (message.includes('-1743') || message.includes('Not authorized to send Apple events')) {
    return new ThingsPermissionError();
  }

  if (message.includes('Application isn’t running') || message.includes('Can’t get application "Things3"')) {
    return new ThingsNotInstalledError();
  }

  if (message.includes('-1728') || message.includes('Can’t get to do id')) {
    return new ThingsNotFoundError('The requested Things item was not found.');
  }

  return new ThingsExecutionError(message, err);
}
