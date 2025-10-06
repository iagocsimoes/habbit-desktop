export function isMac(): boolean {
  return process.platform === 'darwin';
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isLinux(): boolean {
  return process.platform === 'linux';
}

/**
 * Normalizes keyboard shortcuts for the current platform
 * Converts Ctrl to Cmd on macOS
 */
export function normalizeShortcut(shortcut: string): string {
  if (isMac()) {
    // Replace Ctrl with Cmd on macOS
    return shortcut.replace(/ctrl/gi, 'Cmd');
  }
  return shortcut;
}

/**
 * Gets the platform-specific modifier key name
 */
export function getModifierKey(): string {
  return isMac() ? 'Cmd' : 'Ctrl';
}

/**
 * Gets the default shortcut for the current platform
 */
export function getDefaultShortcut(): string {
  return isMac() ? 'Cmd+Shift+/' : 'Ctrl+Shift+/';
}
