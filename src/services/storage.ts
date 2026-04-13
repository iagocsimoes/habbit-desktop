import Store from 'electron-store';
import { safeStorage } from 'electron';

export type NotificationStyle = 'super-minimal' | 'minimal' | 'standard' | 'detailed';

export interface NotificationSettings {
  enabled: boolean;
  style: NotificationStyle;
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  enabled: true,
  style: 'minimal',
};

export type SummaryStylePref = 'bullets' | 'paragraph' | 'oneline' | 'detailed';

export interface SummarySettings {
  style: SummaryStylePref;
}

const DEFAULT_SUMMARY: SummarySettings = {
  style: 'bullets',
};

interface StoreSchema {
  token?: string;
  tokenEncrypted?: boolean;
  userEmail?: string;
  notifications?: NotificationSettings;
  summary?: SummarySettings;
}

class SecureStorage {
  private store: Store<StoreSchema> | null = null;
  private memoryToken: string | null = null;
  private memoryEmail: string | undefined = undefined;

  private getStore(): Store<StoreSchema> {
    if (!this.store) {
      this.store = new Store<StoreSchema>({
        name: 'habbit-secure',
        clearInvalidConfig: true,
      });
    }
    return this.store;
  }

  async setToken(token: string): Promise<void> {
    // Always keep in memory so the session works even if disk storage fails
    this.memoryToken = token;

    try {
      const store = this.getStore();

      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(token);
        (store as any).set('token', encrypted.toString('base64'));
        (store as any).set('tokenEncrypted', true);
      } else {
        (store as any).set('token', token);
        (store as any).set('tokenEncrypted', false);
      }
    } catch (error) {
      console.warn('Could not persist token to disk, using memory only:', error);
      // Don't throw — token is in memory, session will work
    }
  }

  async getToken(): Promise<string | null> {
    // Try memory first
    if (this.memoryToken) return this.memoryToken;

    try {
      const store = this.getStore();
      const stored = (store as any).get('token') as string | undefined;
      if (!stored) return null;

      const wasEncrypted = (store as any).get('tokenEncrypted') as boolean | undefined;

      if (wasEncrypted && safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(stored, 'base64');
          const decrypted = safeStorage.decryptString(buffer);
          this.memoryToken = decrypted;
          return decrypted;
        } catch {
          console.error('Decryption failed, clearing token');
          this.clearToken();
          return null;
        }
      }

      this.memoryToken = stored;
      return stored;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  }

  clearToken(): void {
    this.memoryToken = null;
    try {
      (this.getStore() as any).delete('token');
      (this.getStore() as any).delete('tokenEncrypted');
    } catch {}
  }

  setUserEmail(email: string): void {
    this.memoryEmail = email;
    try {
      (this.getStore() as any).set('userEmail', email);
    } catch {}
  }

  getUserEmail(): string | undefined {
    if (this.memoryEmail) return this.memoryEmail;
    try {
      return (this.getStore() as any).get('userEmail') as string | undefined;
    } catch {
      return undefined;
    }
  }

  getNotificationSettings(): NotificationSettings {
    try {
      const stored = (this.getStore() as any).get('notifications') as NotificationSettings | undefined;
      return stored ? { ...DEFAULT_NOTIFICATIONS, ...stored } : { ...DEFAULT_NOTIFICATIONS };
    } catch {
      return { ...DEFAULT_NOTIFICATIONS };
    }
  }

  setNotificationSettings(settings: NotificationSettings): void {
    try {
      (this.getStore() as any).set('notifications', settings);
    } catch {}
  }

  getSummarySettings(): SummarySettings {
    try {
      const stored = (this.getStore() as any).get('summary') as SummarySettings | undefined;
      return stored ? { ...DEFAULT_SUMMARY, ...stored } : { ...DEFAULT_SUMMARY };
    } catch {
      return { ...DEFAULT_SUMMARY };
    }
  }

  setSummarySettings(settings: SummarySettings): void {
    try {
      (this.getStore() as any).set('summary', settings);
    } catch {}
  }

  clearAll(): void {
    this.memoryToken = null;
    this.memoryEmail = undefined;
    try {
      (this.getStore() as any).clear();
    } catch {}
  }
}

export const secureStorage = new SecureStorage();
export default secureStorage;
