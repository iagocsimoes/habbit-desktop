import { correctionsApi } from '../api/corrections';
import clipboardService from './clipboard';
import { BrowserWindow } from 'electron';
import path from 'path';
import { logger } from '../utils/logger';
import secureStorage, { NotificationSettings, NotificationStyle } from './storage';

class CorrectionService {
  private toastWindow: BrowserWindow | null = null;
  private notificationSettings: NotificationSettings = {
    enabled: true,
    style: 'minimal',
  };

  constructor() {
    setTimeout(() => {
      this.notificationSettings = secureStorage.getNotificationSettings();
    }, 1000);
  }

  updateNotificationSettings(settings: NotificationSettings): void {
    this.notificationSettings = settings;
  }

  private sanitizeMessage(message: string): string {
    return message.replace(/[<>]/g, '').slice(0, 100);
  }

  private closeToast(): void {
    if (this.toastWindow) {
      this.toastWindow.close();
      this.toastWindow = null;
    }
  }

  private buildSuperMinimalHtml(_message: string, type: 'success' | 'error' | 'loading'): string {
    const isLoading = type === 'loading';
    const isError = type === 'error';
    return `
      <!DOCTYPE html><html><head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: transparent; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .dot {
          width: 28px; height: 28px; border-radius: 50%;
          background: #1a1a1a;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; animation: fadeIn 0.15s ease-out forwards;
        }
        ${isLoading ? `
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid #333;
          border-top-color: #888;
          border-radius: 50%;
          animation: spin 0.5s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        ` : ''}
        ${!isLoading ? `
        .icon {
          font-size: 14px; line-height: 1;
          color: ${isError ? '#ff6b6b' : '#6bff6b'};
        }
        ` : ''}
        @keyframes fadeIn { to { opacity: 1; } }
      </style></head><body>
      <div class="dot">
        ${isLoading ? '<div class="spinner"></div>' : `<span class="icon">${isError ? '&#10005;' : '&#10003;'}</span>`}
      </div></body></html>`;
  }

  private buildMinimalHtml(message: string, type: 'success' | 'error' | 'loading'): string {
    const textColor = type === 'error' ? '#ff6b6b' : '#707070';
    const isLoading = type === 'loading';
    return `
      <!DOCTYPE html><html><head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .toast { background: #1a1a1a; color: ${textColor}; padding: 10px 16px; border-radius: 6px; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 8px; opacity: 0; animation: fadeIn 0.15s ease-out forwards; }
        ${isLoading ? `.dots::after { content: ''; animation: dots 1.2s steps(4, end) infinite; } @keyframes dots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } }` : ''}
        @keyframes fadeIn { to { opacity: 1; } }
      </style></head><body>
      <div class="toast">
        ${isLoading ? `<span>${message}<span class="dots"></span></span>` : `<span>${message}</span>`}
      </div></body></html>`;
  }

  private buildStandardHtml(message: string, type: 'success' | 'error' | 'loading'): string {
    const bgColor = type === 'error' ? '#3d2020' : '#2d2d2d';
    const icon = type === 'success' ? '&#10003;' : type === 'error' ? '&#10005;' : '';
    const isLoading = type === 'loading';
    return `
      <!DOCTYPE html><html><head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .toast { background: ${bgColor}; color: white; padding: 14px 20px; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 10px; animation: slideIn 0.2s ease-out; }
        .icon { font-size: 18px; }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style></head><body>
      <div class="toast">
        ${isLoading ? '<div class="spinner"></div>' : `<span class="icon">${icon}</span>`}
        <span>${message}</span>
      </div></body></html>`;
  }

  private buildDetailedHtml(message: string, type: 'success' | 'error' | 'loading'): string {
    const bgColor = type === 'success' ? '#1a2e1a' : type === 'error' ? '#3d2020' : '#1a2a3d';
    const borderColor = type === 'success' ? '#2a4a2a' : type === 'error' ? '#5a3030' : '#2a4a6a';
    const icon = type === 'success' ? '&#10003;' : type === 'error' ? '&#10005;' : '';
    const title = type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Processando';
    const isLoading = type === 'loading';
    return `
      <!DOCTYPE html><html><head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .toast { background: ${bgColor}; color: white; padding: 16px 20px; border-radius: 10px; font-size: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); border: 1px solid ${borderColor}; display: flex; align-items: center; gap: 12px; animation: slideIn 0.25s ease-out; min-width: 240px; }
        .icon-circle { width: 32px; height: 32px; border-radius: 50%; background: ${borderColor}; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .text-col { display: flex; flex-direction: column; gap: 2px; }
        .title { font-weight: 600; font-size: 13px; opacity: 0.7; }
        .msg { font-size: 14px; }
        @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style></head><body>
      <div class="toast">
        <div class="icon-circle">${isLoading ? '<div class="spinner"></div>' : icon}</div>
        <div class="text-col">
          <span class="title">${title}</span>
          <span class="msg">${message}</span>
        </div>
      </div></body></html>`;
  }

  private createToast(message: string, type: 'success' | 'error' | 'loading' = 'success') {
    if (!this.notificationSettings.enabled) {
      this.closeToast();
      return;
    }

    this.closeToast();
    const safeMessage = this.sanitizeMessage(message);
    const style = this.notificationSettings.style;

    const isSuperMinimal = style === 'super-minimal';
    const width = isSuperMinimal ? 50 : style === 'detailed' ? 320 : 300;
    const height = isSuperMinimal ? 50 : style === 'detailed' ? 90 : 80;

    this.toastWindow = new BrowserWindow({
      width,
      height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    let html: string;
    if (style === 'super-minimal') {
      html = this.buildSuperMinimalHtml(safeMessage, type);
    } else if (style === 'minimal') {
      html = this.buildMinimalHtml(safeMessage, type);
    } else if (style === 'detailed') {
      html = this.buildDetailedHtml(safeMessage, type);
    } else {
      html = this.buildStandardHtml(safeMessage, type);
    }

    this.toastWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const { screen } = require('electron');
    const cursorPos = screen.getCursorScreenPoint();
    const offsetY = isSuperMinimal ? 20 : 30;
    this.toastWindow.setPosition(cursorPos.x - Math.round(width / 2), cursorPos.y + offsetY);
    this.toastWindow.showInactive();

    if (type !== 'loading') {
      setTimeout(() => { this.closeToast(); }, 2000);
    }
  }

  async correctSelectedText(language: string = 'pt'): Promise<void> {
    try {
      const validLanguages = ['pt', 'en', 'es'];
      if (!validLanguages.includes(language)) {
        language = 'pt';
      }

      logger.info('Shortcut triggered, capturing selected text...');
      const selectedText = await clipboardService.captureSelectedText();
      logger.info('Captured text:', selectedText ? `"${selectedText.substring(0, 50)}..." (${selectedText.length} chars)` : '(empty)');

      if (!selectedText || selectedText.trim().length === 0) {
        logger.warn('No text selected');
        this.createToast('Nenhum texto selecionado', 'error');
        return;
      }

      if (selectedText.length > 10000) {
        this.createToast('Texto muito longo (max 10.000 caracteres)', 'error');
        return;
      }

      this.createToast('Corrigindo', 'loading');

      logger.info('Calling correction API...');
      const response = await correctionsApi.createCorrection(selectedText, language);
      logger.info('API response:', response);

      const correctedText = response.correction.correctedText;

      if (!correctedText || typeof correctedText !== 'string') {
        throw new Error('Resposta invalida do servidor');
      }

      logger.info('Replacing text with:', correctedText.substring(0, 50));
      await clipboardService.replaceSelectedText(correctedText);

      this.createToast('Texto corrigido', 'success');
    } catch (error) {
      logger.error('Error correcting text:', error instanceof Error ? error.message : error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.createToast(errorMessage, 'error');
    }
  }
}

export const correctionService = new CorrectionService();
export default correctionService;
