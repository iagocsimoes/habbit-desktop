import { GlobalKeyboardListener } from 'node-global-key-listener';

type ShortcutCallback = () => void | Promise<void>;

class KeyboardService {
  private listener: GlobalKeyboardListener | null = null;
  private currentShortcut: string = 'CTRL + /';
  private callback: ShortcutCallback | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.listener = new GlobalKeyboardListener();
  }

  private parseShortcut(shortcut: string): { keys: string[]; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean } {
    const parts = shortcut.toUpperCase().split('+').map(k => k.trim());

    // Map common key names to their actual event names
    const keyMap: Record<string, string> = {
      '/': 'FORWARD SLASH',
      'SLASH': 'FORWARD SLASH',
      '\\': 'BACK SLASH',
      'BACKSLASH': 'BACK SLASH',
      ',': 'COMMA',
      '.': 'PERIOD',
      ';': 'SEMICOLON',
      "'": 'QUOTE',
      '[': 'LEFT BRACKET',
      ']': 'RIGHT BRACKET',
      '-': 'MINUS',
      '=': 'EQUAL',
    };

    const keys = parts
      .filter(k => !['CTRL', 'ALT', 'SHIFT', 'CMD', 'COMMAND', 'META'].includes(k))
      .map(k => keyMap[k] || k);

    return {
      keys,
      ctrl: parts.includes('CTRL'),
      alt: parts.includes('ALT'),
      shift: parts.includes('SHIFT'),
      meta: parts.includes('CMD') || parts.includes('COMMAND') || parts.includes('META'),
    };
  }

  register(shortcut: string, callback: ShortcutCallback): void {
    this.currentShortcut = shortcut;
    this.callback = callback;

    if (this.listener) {
      // Recreate listener to remove old listeners
      this.listener.kill();
      this.listener = new GlobalKeyboardListener();

      const shortcutConfig = this.parseShortcut(shortcut);

      this.listener.addListener((event, down) => {
        if (!this.isEnabled || event.state !== 'DOWN') return;

        const keyName = event.name?.toUpperCase() || '';

        // Get modifier states from the down object
        const hasCtrl = (down as any)['LEFT CTRL'] || (down as any)['RIGHT CTRL'] || false;
        const hasAlt = (down as any)['LEFT ALT'] || (down as any)['RIGHT ALT'] || false;
        const hasShift = (down as any)['LEFT SHIFT'] || (down as any)['RIGHT SHIFT'] || false;
        const hasMeta = (down as any)['LEFT META'] || (down as any)['RIGHT META'] || false;

        // Check if all modifiers and key match
        if (
          hasCtrl === shortcutConfig.ctrl &&
          hasAlt === shortcutConfig.alt &&
          hasShift === shortcutConfig.shift &&
          hasMeta === shortcutConfig.meta &&
          shortcutConfig.keys.includes(keyName)
        ) {
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
    if (this.listener) {
      this.listener.kill();
      this.listener = null;
    }
    this.isEnabled = false;
  }
}

export const keyboardService = new KeyboardService();
export default keyboardService;
