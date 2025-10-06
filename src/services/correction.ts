import { correctionsApi } from '../api/corrections';
import clipboardService from './clipboard';
import { BrowserWindow } from 'electron';
import path from 'path';

class CorrectionService {
  private toastWindow: BrowserWindow | null = null;

  private sanitizeMessage(message: string): string {
    // Remove HTML tags and limit length
    return message
      .replace(/[<>]/g, '')
      .slice(0, 100);
  }

  private createToast(message: string, type: 'success' | 'error' = 'success') {
    if (this.toastWindow) {
      this.toastWindow.close();
    }

    // Sanitize message to prevent XSS
    const safeMessage = this.sanitizeMessage(message);

    this.toastWindow = new BrowserWindow({
      width: 300,
      height: 80,
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          .toast {
            background: ${type === 'success' ? '#2d2d2d' : '#3d2020'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.2s ease-out;
          }
          .icon {
            font-size: 18px;
          }
          @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        </style>
      </head>
      <body>
        <div class="toast">
          <span class="icon">${type === 'success' ? '✓' : '✗'}</span>
          <span>${safeMessage}</span>
        </div>
      </body>
      </html>
    `;

    this.toastWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Position at mouse cursor
    const { screen } = require('electron');
    const cursorPos = screen.getCursorScreenPoint();

    // Offset below cursor so it doesn't block the text
    this.toastWindow.setPosition(cursorPos.x - 150, cursorPos.y + 30);
    this.toastWindow.showInactive();

    // Auto-close after 2 seconds
    setTimeout(() => {
      if (this.toastWindow) {
        this.toastWindow.close();
        this.toastWindow = null;
      }
    }, 2000);
  }

  async correctSelectedText(language: string = 'pt'): Promise<void> {
    try {
      // Validate language parameter
      const validLanguages = ['pt', 'en', 'es'];
      if (!validLanguages.includes(language)) {
        language = 'pt'; // Default to Portuguese
      }

      // Capture selected text
      const selectedText = await clipboardService.captureSelectedText();

      if (!selectedText || selectedText.trim().length === 0) {
        this.createToast('Nenhum texto selecionado', 'error');
        return;
      }

      // Validate text length (max 10000 characters for safety)
      if (selectedText.length > 10000) {
        this.createToast('Texto muito longo (máx 10.000 caracteres)', 'error');
        return;
      }

      // Call API to correct text
      const response = await correctionsApi.createCorrection(selectedText, language);

      const correctedText = response.correction.correctedText;

      // Validate corrected text before replacing
      if (!correctedText || typeof correctedText !== 'string') {
        throw new Error('Resposta inválida do servidor');
      }

      // Replace selected text with corrected text
      await clipboardService.replaceSelectedText(correctedText);

      // Show minimal success toast
      this.createToast('Texto corrigido', 'success');
    } catch (error) {
      console.error('Error correcting text:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.createToast(errorMessage, 'error');
    }
  }
}

export const correctionService = new CorrectionService();
export default correctionService;
