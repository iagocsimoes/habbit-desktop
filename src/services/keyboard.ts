import { GlobalKeyboardListener } from 'node-global-key-listener';
import { logger } from '../utils/logger';

type ShortcutCallback = () => void | Promise<void>;

class KeyboardService {
  private listener: GlobalKeyboardListener | null = null;
  private currentShortcut: string = 'CTRL + /';
  private callback: ShortcutCallback | null = null;
  private isEnabled: boolean = false;

  constructor() {
    // Listener is created on first register() call
  }

  private parseShortcut(shortcut: string): { keys: string[]; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean } {
    const parts = shortcut.toUpperCase().split('+').map(k => k.trim());

    // Map common key names to their actual event names
    // Map shortcut key names to node-global-key-listener event names (macOS uses DOT, not PERIOD, etc.)
    const keyMap: Record<string, string> = {
      '/': 'FORWARD SLASH',
      'SLASH': 'FORWARD SLASH',
      '\\': 'BACK SLASH',
      'BACKSLASH': 'BACK SLASH',
      ',': 'COMMA',
      '.': 'DOT',
      'PERIOD': 'DOT',
      ';': 'SEMICOLON',
      "'": 'QUOTE',
      '[': 'LEFT BRACKET',
      ']': 'RIGHT BRACKET',
      '-': 'MINUS',
      '=': 'EQUAL',
      'SPACE': 'SPACE',
    };

    const modifiers = ['CTRL', 'ALT', 'SHIFT', 'CMD', 'COMMAND', 'META'];
    const keys = parts
      .filter(k => !modifiers.includes(k))
      .map(k => keyMap[k] || k);

    return {
      keys,
      ctrl: parts.includes('CTRL'),
      alt: parts.includes('ALT'),
      shift: parts.includes('SHIFT'),
      meta: parts.includes('CMD') || parts.includes('COMMAND') || parts.includes('META'),
    };
  }

  private safeKill(): void {
    try {
      if (this.listener) {
        this.listener.kill();
      }
    } catch (error) {
      logger.warn('Error killing keyboard listener:', error);
    }
    this.listener = null;
  }

  register(shortcut: string, callback: ShortcutCallback): void {
    this.currentShortcut = shortcut;
    this.callback = callback;

    // Recreate listener to remove old listeners
    this.safeKill();
    this.listener = new GlobalKeyboardListener();

    if (this.listener) {
      const shortcutConfig = this.parseShortcut(shortcut);
      logger.info('Shortcut config:', JSON.stringify(shortcutConfig));

      this.listener.addListener((event, down) => {
        if (!this.isEnabled || event.state !== 'DOWN') return;

        const keyName = event.name?.toUpperCase() || '';

        const hasCtrl = (down as any)['LEFT CTRL'] || (down as any)['RIGHT CTRL'] || false;
        const hasAlt = (down as any)['LEFT ALT'] || (down as any)['RIGHT ALT'] || false;
        const hasShift = (down as any)['LEFT SHIFT'] || (down as any)['RIGHT SHIFT'] || false;
        const hasMeta = (down as any)['LEFT META'] || (down as any)['RIGHT META'] || false;

        // Log key presses for debugging (only when modifiers are held)
        if (hasCtrl || hasMeta || hasAlt) {
          logger.info(`Key pressed: ${keyName} ctrl=${hasCtrl} alt=${hasAlt} shift=${hasShift} meta=${hasMeta}`);
        }

        if (
          hasCtrl === shortcutConfig.ctrl &&
          hasAlt === shortcutConfig.alt &&
          hasShift === shortcutConfig.shift &&
          hasMeta === shortcutConfig.meta &&
          shortcutConfig.keys.includes(keyName)
        ) {
          logger.info('Shortcut matched!');
          if (this.callback) {
            this.callback();
          }
        }
      });

      this.isEnabled = true;
    }
  }

  updateShortcut(shortcut: string): void {
    if (this.callback) {
      this.register(shortcut, this.callback);
    }
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  destroy(): void {
    this.safeKill();
    this.isEnabled = false;
  }
}

export const keyboardService = new KeyboardService();
export default keyboardService;
