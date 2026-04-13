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
 * Normalizes keyboard shortcuts for the keyboard listener.
 * On macOS, Cmd is stored as "Cmd" from the settings UI - map it to META
 * for node-global-key-listener. Ctrl stays as Ctrl.
 */
export function normalizeShortcut(shortcut: string): string {
  // Map "Cmd" to "META" for node-global-key-listener
  return shortcut.replace(/\bCmd\b/gi, 'META');
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

/**
 * Gets the default voice shortcut for the current platform
 */
export function getDefaultVoiceShortcut(): string {
  return isMac() ? 'Cmd+Shift+V' : 'Ctrl+Shift+V';
}

export function getDefaultSummaryShortcut(): string {
  return isMac() ? 'Cmd+Shift+S' : 'Ctrl+Shift+S';
}
