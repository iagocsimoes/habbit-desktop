import { BrowserWindow, globalShortcut, screen, ipcMain } from 'electron';
import path from 'path';
import clipboardService from './clipboard';
import { summariesApi, SummaryStyle } from '../api/summaries';
import secureStorage from './storage';
import { logger } from '../utils/logger';

class SummaryService {
  private modalWindow: BrowserWindow | null = null;
  private currentAccelerator: string = '';
  private isRegistered: boolean = false;

  constructor() {
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    ipcMain.on('summary:close', () => {
      this.closeModal();
    });

    ipcMain.on('summary:copy', (_, text: string) => {
      if (typeof text === 'string' && text.length > 0) {
        clipboardService.setClipboard(text);
      }
    });
  }

  private toAccelerator(shortcut: string): string {
    const parts = shortcut.split('+').map(k => k.trim());
    const mapped = parts.map(part => {
      switch (part.toUpperCase()) {
        case 'CTRL': case 'CONTROL': return 'Ctrl';
        case 'CMD': case 'COMMAND': case 'META': return 'Command';
        case 'ALT': case 'OPTION': return 'Alt';
        case 'SHIFT': return 'Shift';
        default: return part;
      }
    });
    return mapped.join('+');
  }

  register(shortcut: string): boolean {
    this.unregister();

    const accelerator = this.toAccelerator(shortcut);
    this.currentAccelerator = accelerator;

    try {
      const success = globalShortcut.register(accelerator, () => {
        this.handleShortcut();
      });

      if (!success) {
        logger.error('Failed to register summary shortcut (may be in use):', accelerator);
        return false;
      }

      logger.info('Summary shortcut registered:', accelerator);
      this.isRegistered = true;
      return true;
    } catch (error) {
      logger.error('Error registering summary shortcut:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  unregister(): void {
    if (this.isRegistered && this.currentAccelerator) {
      try {
        globalShortcut.unregister(this.currentAccelerator);
      } catch (error) {
        logger.warn('Error unregistering summary shortcut:', error);
      }
      this.isRegistered = false;
    }
  }

  updateShortcut(shortcut: string): boolean {
    return this.register(shortcut);
  }

  private async handleShortcut(): Promise<void> {
    try {
      logger.info('Summary shortcut triggered, capturing selected text...');
      const selectedText = await clipboardService.captureSelectedText();

      if (!selectedText || selectedText.trim().length === 0) {
        logger.warn('No text selected for summary');
        return;
      }

      if (selectedText.length > 10000) {
        logger.warn('Text too long for summary');
        return;
      }

      // Show modal with loading state
      this.createModal(selectedText);

      // Get summary style from storage
      const summarySettings = secureStorage.getSummarySettings();

      logger.info('Calling summary API, style:', summarySettings.style);
      const result = await summariesApi.createSummary(selectedText, 'pt', summarySettings.style);
      logger.info('Summary full response:', JSON.stringify(result));

      const raw = result as any;
      const summaryText: string =
        typeof raw.summary === 'string'
          ? raw.summary
          : (raw.summary?.summaryText || raw.summary?.text || raw.summaryText || raw.text || '');

      if (this.modalWindow && !this.modalWindow.isDestroyed()) {
        this.modalWindow.webContents.send('summary:result', summaryText);
      }
    } catch (error) {
      logger.error('Summary error:', error instanceof Error ? error.message : error);
      if (this.modalWindow && !this.modalWindow.isDestroyed()) {
        const msg = error instanceof Error ? error.message : 'Erro ao resumir texto';
        this.modalWindow.webContents.send('summary:error', msg);
      }
    }
  }

  private createModal(originalText: string): void {
    this.closeModal();

    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const cursorPos = screen.getCursorScreenPoint();
    const modalWidth = 420;
    const modalHeight = 320;

    // Position near cursor but keep within screen bounds
    let x = cursorPos.x - Math.round(modalWidth / 2);
    let y = cursorPos.y - modalHeight - 20;

    const { x: workX, y: workY, width: workW, height: workH } = display.workArea;
    x = Math.max(workX + 10, Math.min(x, workX + workW - modalWidth - 10));
    if (y < workY + 10) y = cursorPos.y + 20;
    y = Math.max(workY + 10, Math.min(y, workY + workH - modalHeight - 10));

    this.modalWindow = new BrowserWindow({
      width: modalWidth,
      height: modalHeight,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, '../preload', 'preload.js'),
      },
    });

    this.modalWindow.setVisibleOnAllWorkspaces(true);

    this.modalWindow.loadFile(path.join(__dirname, '../windows', 'summary-modal.html'));

    this.modalWindow.once('ready-to-show', () => {
      this.modalWindow?.showInactive();
    });

    this.modalWindow.on('blur', () => {
      // Close when clicking outside
      setTimeout(() => this.closeModal(), 100);
    });

    this.modalWindow.on('closed', () => {
      this.modalWindow = null;
    });
  }

  private closeModal(): void {
    if (this.modalWindow && !this.modalWindow.isDestroyed()) {
      this.modalWindow.close();
    }
    this.modalWindow = null;
  }

  destroy(): void {
    this.unregister();
    this.closeModal();
  }
}

export const summaryService = new SummaryService();
export default summaryService;
