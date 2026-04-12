import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification, systemPreferences } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import authService from './services/auth';
import keyboardService from './services/keyboard';
import correctionService from './services/correction';
import { correctionsApi } from './api/corrections';
import { normalizeShortcut, isMac } from './utils/platform';
import { logger } from './utils/logger';

let tray: Tray | null = null;
let loginWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

// Show a cross-platform notification
function showNotification(title: string, body: string) {
  new Notification({ title, body }).show();
}

// Check macOS Accessibility permission and poll until granted
function checkAccessibilityPermission(): boolean {
  if (!isMac()) return true;
  const trusted = systemPreferences.isTrustedAccessibilityClient(true);
  if (!trusted) {
    // Poll every 2 seconds until user grants permission
    const pollInterval = setInterval(() => {
      if (systemPreferences.isTrustedAccessibilityClient(false)) {
        clearInterval(pollInterval);
        console.log('Accessibility permission granted');
        // Re-initialize keyboard listener now that we have permission
        const user = authService.getCurrentUser();
        if (user) {
          const platformShortcut = normalizeShortcut(user.shortcut);
          const registered = keyboardService.register(platformShortcut, async () => {
            await correctionService.correctSelectedText();
          });
          if (!registered) {
            showNotification('Erro no Habbit', 'Não foi possível registrar o atalho de teclado. Tente reiniciar o aplicativo.');
          }
        }
      }
    }, 2000);
  }
  return trusted;
}

// Create tray icon
function createTray() {
  if (isMac()) {
    // Use dedicated tray icon on macOS (template image adapts to light/dark menu bar)
    const trayIconPath = path.join(__dirname, '../build/trayIcon.png');
    const trayIcon = nativeImage.createFromPath(trayIconPath);
    trayIcon.setTemplateImage(true);
    tray = new Tray(trayIcon);
  } else {
    const iconPath = path.join(__dirname, '../build/icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
  }

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
      label: 'Ver Logs',
      click: () => {
        const { shell } = require('electron');
        shell.openPath(logger.getLogPath());
      },
    },
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
    titleBarStyle: isMac() ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac() ? { x: 12, y: 12 } : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload', 'preload.js'),
    },
  });

  if (!isMac()) {
    loginWindow.removeMenu();
  }
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
    titleBarStyle: isMac() ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac() ? { x: 12, y: 12 } : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload', 'preload.js'),
    },
  });

  if (!isMac()) {
    settingsWindow.removeMenu();
  }
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
  if (typeof shortcut !== 'string' || shortcut.length === 0 || shortcut.length > 50) return false;
  // Must contain at least one modifier + one key separated by +
  const parts = shortcut.split('+').map(k => k.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  const modifiers = ['ctrl', 'alt', 'shift', 'cmd', 'command', 'meta'];
  const hasModifier = parts.some(p => modifiers.includes(p.toLowerCase()));
  return hasModifier;
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
      logger.info('Login successful:', user.email, 'shortcut:', user.shortcut);

      // Register keyboard shortcut with platform normalization
      const platformShortcut = normalizeShortcut(user.shortcut);
      logger.info('Registering keyboard shortcut after login:', platformShortcut);
      const registered = keyboardService.register(platformShortcut, async () => {
        logger.info('Shortcut triggered!');
        await correctionService.correctSelectedText();
      });

      if (!registered) {
        logger.error('Falha ao registrar atalho de teclado após login');
        showNotification('Erro no Habbit', 'Não foi possível registrar o atalho de teclado. Tente reiniciar o aplicativo.');
      }

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

      showNotification(
        'Atualização Disponível',
        'Uma nova versão do Habbit foi baixada e será instalada ao reiniciar o aplicativo.'
      );
    });

    autoUpdater.on('error', (error) => {
      console.error('Erro ao atualizar:', error);
    });
  }
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    setupIpcHandlers();
    setupAutoUpdater();
    createTray();

    // Check Accessibility permission on macOS (needed for global shortcuts & clipboard automation)
    if (!checkAccessibilityPermission()) {
      showNotification(
        'Permissão Necessária',
        'O Habbit precisa de permissão de Acessibilidade para funcionar. Vá em Ajustes do Sistema > Privacidade e Segurança > Acessibilidade.'
      );
    }

    logger.info('App started, platform:', process.platform, 'arch:', process.arch);

    // Try to auto-login from saved token
    const user = await authService.initializeFromStorage();

    if (user) {
      logger.info('User loaded from storage:', user.email, 'shortcut:', user.shortcut);
      // Register keyboard shortcut with platform normalization
      const platformShortcut = normalizeShortcut(user.shortcut);
      logger.info('Registering keyboard shortcut:', platformShortcut);
      const registered = keyboardService.register(platformShortcut, async () => {
        logger.info('Shortcut triggered!');
        await correctionService.correctSelectedText();
      });

      if (!registered) {
        logger.error('Falha ao registrar atalho de teclado no startup');
        showNotification('Erro no Habbit', 'Não foi possível registrar o atalho de teclado. Tente reiniciar o aplicativo.');
      }

      updateTrayMenu();
    } else {
      logger.info('No stored user, showing login window');
      // Show login window
      createLoginWindow();
    }
  } catch (error) {
    logger.error('Erro fatal na inicialização:', error instanceof Error ? error.message : error);
    showNotification('Erro no Habbit', 'Erro ao iniciar o aplicativo. Verifique os logs.');
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
