import { contextBridge, ipcRenderer } from 'electron';

// Type validation helpers
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function sanitizeString(value: unknown, maxLength: number = 1000): string {
  if (!isString(value)) {
    throw new Error('Invalid input: expected string');
  }
  return value.slice(0, maxLength);
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  login: (email: string, password: string) => {
    const sanitizedEmail = sanitizeString(email, 255);
    const sanitizedPassword = sanitizeString(password, 128);
    return ipcRenderer.invoke('auth:login', sanitizedEmail, sanitizedPassword);
  },
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),

  // Settings
  updateShortcut: (shortcut: string) => {
    const sanitizedShortcut = sanitizeString(shortcut, 50);
    return ipcRenderer.invoke('settings:updateShortcut', sanitizedShortcut);
  },
  updateCorrectionStyle: (style: string) => {
    const sanitizedStyle = sanitizeString(style, 20);
    return ipcRenderer.invoke('settings:updateCorrectionStyle', sanitizedStyle);
  },

  // Stats
  getStats: () => ipcRenderer.invoke('stats:get'),

  // Window
  closeWindow: () => ipcRenderer.send('window:close'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),

  // Events
  onAuthStateChanged: (callback: (user: any) => void) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('auth:stateChanged', (_, user) => callback(user));
  },
});

export {};
