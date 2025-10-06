import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import authService from './services/auth';
import keyboardService from './services/keyboard';
import correctionService from './services/correction';
import { correctionsApi } from './api/corrections';
import { normalizeShortcut } from './utils/platform';

let tray: Tray | null = null;
let loginWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

// Create tray icon
function createTray() {
  // Use the app icon for tray (will be resized automatically)
  const iconPath = path.join(__dirname, '../build/icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  updateTrayMenu();
  tray.setToolTip('Habbit - Corretor de Texto');
}

function updateTrayMenu() {
  const user = authService.getCurrentUser();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: user ? `${user.email} (${user.plan})` : 'Não autenticado',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Configurações',
      click: () => createSettingsWindow(),
      enabled: !!user,
    },
    {
      label: user ? 'Sair da Conta' : 'Fazer Login',
      click: async () => {
        if (user) {
          await authService.logout();
          keyboardService.destroy();
          updateTrayMenu();
          createLoginWindow();
        } else {
          createLoginWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sair do Aplicativo',
      click: () => {
        keyboardService.destroy();
        app.quit();
      },
    },
  ]);

  tray?.setContextMenu(contextMenu);
}

function createLoginWindow() {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 450,
    height: 550,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload', 'preload.js'),
    },
  });

  loginWindow.removeMenu();
  loginWindow.loadFile(path.join(__dirname, 'windows', 'login.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    loginWindow.webContents.openDevTools({ mode: 'detach' });
  }

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload', 'preload.js'),
    },
  });

  settingsWindow.removeMenu();
  settingsWindow.loadFile(path.join(__dirname, 'windows', 'settings.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    settingsWindow.webContents.openDevTools({ mode: 'detach' });
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Input validation helpers
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email) && email.length <= 255;
}

function validatePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

function validateShortcut(shortcut: string): boolean {
  const validKeys = /^(CTRL|ALT|SHIFT|CMD|COMMAND|META|\+|[A-Z0-9]|FORWARD SLASH|BACK SLASH|COMMA|PERIOD|SEMICOLON|QUOTE|LEFT BRACKET|RIGHT BRACKET|MINUS|EQUAL|\s)+$/i;
  return typeof shortcut === 'string' && validKeys.test(shortcut) && shortcut.length <= 50;
}

function validateCorrectionStyle(style: string): boolean {
  const validStyles = ['correct', 'formal', 'informal', 'concise', 'detailed'];
  return typeof style === 'string' && validStyles.includes(style);
}

// Setup IPC Handlers
function setupIpcHandlers() {
  ipcMain.handle('auth:login', async (_, email: string, password: string) => {
    try {
      // Validate inputs
      if (!validateEmail(email)) {
        throw new Error('Email inválido');
      }
      if (!validatePassword(password)) {
        throw new Error('Senha inválida');
      }

      const user = await authService.login(email, password);

      // Register keyboard shortcut with platform normalization
      const platformShortcut = normalizeShortcut(user.shortcut);
      keyboardService.register(platformShortcut, async () => {
        await correctionService.correctSelectedText();
      });

      updateTrayMenu();

      // Close login window and open settings
      if (loginWindow) {
        loginWindow.close();
      }

      // Open settings window after successful login
      setTimeout(() => {
        createSettingsWindow();
      }, 300);

      return user;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('auth:logout', async () => {
    await authService.logout();
    keyboardService.destroy();
    updateTrayMenu();

    if (settingsWindow) {
      settingsWindow.close();
    }

    createLoginWindow();
  });

  ipcMain.handle('auth:getCurrentUser', async () => {
    return authService.getCurrentUser();
  });

  ipcMain.handle('settings:updateShortcut', async (_, shortcut: string) => {
    // Validate shortcut
    if (!validateShortcut(shortcut)) {
      throw new Error('Atalho inválido');
    }

    await authService.updateShortcut(shortcut);
    const platformShortcut = normalizeShortcut(shortcut);
    keyboardService.updateShortcut(platformShortcut);
  });

  ipcMain.handle('settings:updateCorrectionStyle', async (_, style: string) => {
    // Validate correction style
    if (!validateCorrectionStyle(style)) {
      throw new Error('Estilo de correção inválido');
    }

    await authService.updateCorrectionStyle(style as any);
  });

  ipcMain.handle('stats:get', async () => {
    return await correctionsApi.getStats();
  });

  ipcMain.on('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.close();
  });

  ipcMain.on('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.minimize();
  });
}

// Auto-updater configuration
function setupAutoUpdater() {
  // Only check for updates in production
  if (process.env.NODE_ENV === 'production') {
    // Log auto-updater events
    autoUpdater.logger = {
      info: (msg: string) => console.log('[Auto-Updater]', msg),
      warn: (msg: string) => console.warn('[Auto-Updater]', msg),
      error: (msg: string) => console.error('[Auto-Updater]', msg),
      debug: (msg: string) => console.debug('[Auto-Updater]', msg)
    };

    // Check for updates on startup
    autoUpdater.checkForUpdatesAndNotify();

    // Check for updates every 4 hours
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 4 * 60 * 60 * 1000);

    // Handle update events
    autoUpdater.on('update-available', () => {
      console.log('Nova atualização disponível! Baixando...');
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('Atualização baixada! Será instalada ao reiniciar o aplicativo.');

      // Notify user via tray
      if (tray) {
        tray.displayBalloon({
          title: 'Atualização Disponível',
          content: 'Uma nova versão do Habbit foi baixada e será instalada ao reiniciar o aplicativo.'
        });
      }
    });

    autoUpdater.on('error', (error) => {
      console.error('Erro ao atualizar:', error);
    });
  }
}

// App lifecycle
app.whenReady().then(async () => {
  setupIpcHandlers();
  setupAutoUpdater();
  createTray();

  // Try to auto-login from saved token
  const user = await authService.initializeFromStorage();

  if (user) {
    // Register keyboard shortcut with platform normalization
    const platformShortcut = normalizeShortcut(user.shortcut);
    keyboardService.register(platformShortcut, async () => {
      await correctionService.correctSelectedText();
    });

    updateTrayMenu();
  } else {
    // Show login window
    createLoginWindow();
  }
});

app.on('window-all-closed', () => {
  // Prevent app from quitting when all windows are closed on all platforms
  // This allows the tray icon to remain active
});

app.on('before-quit', () => {
  keyboardService.destroy();
});

// Security: Prevent navigation to external sites and other attacks
app.on('web-contents-created', (_, contents) => {
  // Block all navigation (allow only file:// protocol)
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.protocol !== 'file:' && parsedUrl.protocol !== 'data:') {
      console.warn('Blocked navigation to:', navigationUrl);
      event.preventDefault();
    }
  });

  // Block webview attachments
  contents.on('will-attach-webview', (event) => {
    console.warn('Blocked webview attachment');
    event.preventDefault();
  });

  // Block opening new windows
  contents.setWindowOpenHandler(({ url }) => {
    console.warn('Blocked window.open to:', url);
    return { action: 'deny' };
  });

  // Disable remote module access
  contents.on('did-finish-load', () => {
    contents.executeJavaScript(`
      delete window.require;
      delete window.exports;
      delete window.module;
    `).catch(() => {});
  });
});
