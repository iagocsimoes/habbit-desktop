import { globalShortcut } from 'electron';
import { logger } from '../utils/logger';

type ShortcutCallback = () => void | Promise<void>;

class KeyboardService {
  private currentAccelerator: string = '';
  private callback: ShortcutCallback | null = null;
  private isEnabled: boolean = false;
  private isRegistered: boolean = false;

  /**
   * Converts a user-facing shortcut string to Electron accelerator format.
   * e.g. "Ctrl + /" → "Ctrl+/", "Cmd+Shift+/" → "Command+Shift+/"
   */
  private toAccelerator(shortcut: string): string {
    const parts = shortcut.split('+').map(k => k.trim());

    const mapped = parts.map(part => {
      switch (part.toUpperCase()) {
        case 'CTRL':
        case 'CONTROL':
          return 'Ctrl';
        case 'CMD':
        case 'COMMAND':
        case 'META':
          return 'Command';
        case 'ALT':
        case 'OPTION':
          return 'Alt';
        case 'SHIFT':
          return 'Shift';
        case 'FORWARD SLASH':
        case 'SLASH':
          return '/';
        case 'BACK SLASH':
        case 'BACKSLASH':
          return '\\';
        case 'SPACE':
          return 'Space';
        case 'DOT':
        case 'PERIOD':
          return '.';
        case 'COMMA':
          return ',';
        case 'SEMICOLON':
          return ';';
        case 'EQUAL':
        case 'EQUALS':
          return '=';
        case 'MINUS':
          return '-';
        default:
          return part;
      }
    });

    return mapped.join('+');
  }

  register(shortcut: string, callback: ShortcutCallback): boolean {
    this.callback = callback;

    // Unregister previous shortcut
    this.unregisterCurrent();

    const accelerator = this.toAccelerator(shortcut);
    this.currentAccelerator = accelerator;

    try {
      const success = globalShortcut.register(accelerator, () => {
        if (!this.isEnabled) return;
        if (this.callback) {
          Promise.resolve(this.callback()).catch(err => {
            logger.error('Error in shortcut callback:', err instanceof Error ? err.message : err);
          });
        }
      });

      if (!success) {
        logger.error('Failed to register global shortcut (may be in use by another app):', accelerator);
        return false;
      }

      logger.info('Global shortcut registered:', accelerator);
      this.isEnabled = true;
      this.isRegistered = true;
      return true;
    } catch (error) {
      logger.error('Error registering global shortcut:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  private unregisterCurrent(): void {
    if (this.isRegistered && this.currentAccelerator) {
      try {
        globalShortcut.unregister(this.currentAccelerator);
      } catch (error) {
        logger.warn('Error unregistering shortcut:', error);
      }
      this.isRegistered = false;
    }
  }

  updateShortcut(shortcut: string): boolean {
    if (this.callback) {
      return this.register(shortcut, this.callback);
    }
    return false;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  destroy(): void {
    this.unregisterCurrent();
    this.isEnabled = false;
  }
}

export const keyboardService = new KeyboardService();
export default keyboardService;
