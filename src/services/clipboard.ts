import { clipboard } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

/** Common exec options: hide console window to prevent focus stealing in packaged builds */
const execOptions = { windowsHide: true };

class ClipboardService {
  /**
   * Captures the currently selected text by simulating Ctrl+C
   * This preserves the original clipboard and restores it after
   */
  async captureSelectedText(): Promise<string> {
    try {
      // Save current clipboard content
      const originalClipboard = clipboard.readText();

      // Clear clipboard
      clipboard.writeText('');

      // Simulate Ctrl+C to copy selected text
      await this.simulateCopy();

      // Wait for the clipboard to update (macOS needs more time)
      await this.sleep(300);

      // Read the selected text
      const selectedText = clipboard.readText();

      // Restore original clipboard
      clipboard.writeText(originalClipboard);

      return selectedText || '';
    } catch (error) {
      logger.error('Erro ao capturar texto selecionado:', error instanceof Error ? error.message : error);
      throw new Error('Falha ao capturar texto. Verifique as permissões do sistema.');
    }
  }

  /**
   * Replaces the selected text with corrected text
   * Uses Ctrl+V to paste the corrected text
   */
  async replaceSelectedText(correctedText: string): Promise<void> {
    try {
      // Save current clipboard content
      const originalClipboard = clipboard.readText();

      // Write corrected text to clipboard
      clipboard.writeText(correctedText);

      // Wait a bit
      await this.sleep(50);

      // Simulate Ctrl+V to paste corrected text
      await this.simulatePaste();

      // Wait for paste to complete
      await this.sleep(100);

      // Restore original clipboard
      clipboard.writeText(originalClipboard);
    } catch (error) {
      logger.error('Erro ao substituir texto selecionado:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Simulates Ctrl+C using OS-specific commands
   */
  private async simulateCopy(): Promise<void> {
    try {
      if (process.platform === 'win32') {
        await execAsync('powershell -NoProfile -NonInteractive -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^c\')"', execOptions);
      } else if (process.platform === 'darwin') {
        await execAsync('osascript -e \'tell application "System Events" to keystroke "c" using command down\'');
      } else {
        await execAsync('xdotool key ctrl+c');
      }
    } catch (error) {
      logger.error('Falha ao simular cópia no', process.platform, ':', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Simulates Ctrl+V using OS-specific commands
   */
  private async simulatePaste(): Promise<void> {
    try {
      if (process.platform === 'win32') {
        await execAsync('powershell -NoProfile -NonInteractive -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"', execOptions);
      } else if (process.platform === 'darwin') {
        await execAsync('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
      } else {
        await execAsync('xdotool key ctrl+v');
      }
    } catch (error) {
      logger.error('Falha ao simular colagem no', process.platform, ':', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Gets current clipboard content without modifying it
   */
  getClipboard(): string {
    return clipboard.readText();
  }

  /**
   * Sets clipboard content
   */
  setClipboard(text: string): void {
    clipboard.writeText(text);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const clipboardService = new ClipboardService();
export default clipboardService;
