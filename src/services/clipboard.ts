import { clipboard } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

      // Wait a bit for the clipboard to update
      await this.sleep(100);

      // Read the selected text
      const selectedText = clipboard.readText();

      // Restore original clipboard
      clipboard.writeText(originalClipboard);

      return selectedText || '';
    } catch (error) {
      console.error('Error capturing selected text:', error);
      return '';
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
      console.error('Error replacing selected text:', error);
      throw error;
    }
  }

  /**
   * Simulates Ctrl+C using OS-specific commands
   */
  private async simulateCopy(): Promise<void> {
    if (process.platform === 'win32') {
      // Windows: Use PowerShell to send Ctrl+C
      await execAsync('powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^c\')"');
    } else if (process.platform === 'darwin') {
      // macOS: Use AppleScript
      await execAsync('osascript -e \'tell application "System Events" to keystroke "c" using command down\'');
    } else {
      // Linux: Use xdotool
      await execAsync('xdotool key ctrl+c');
    }
  }

  /**
   * Simulates Ctrl+V using OS-specific commands
   */
  private async simulatePaste(): Promise<void> {
    if (process.platform === 'win32') {
      // Windows: Use PowerShell to send Ctrl+V
      await execAsync('powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"');
    } else if (process.platform === 'darwin') {
      // macOS: Use AppleScript
      await execAsync('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
    } else {
      // Linux: Use xdotool
      await execAsync('xdotool key ctrl+v');
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
