import Store from 'electron-store';
import { safeStorage } from 'electron';

interface StoreSchema {
  token?: string;
  userEmail?: string;
}

class SecureStorage {
  private store: Store<StoreSchema>;

  constructor() {
    // Use cryptographically secure random key for encryption
    const crypto = require('crypto');
    const encryptionKey = crypto.randomBytes(32).toString('hex');

    this.store = new Store<StoreSchema>({
      name: 'habbit-secure',
      encryptionKey,
      clearInvalidConfig: true,
    });
  }

  async setToken(token: string): Promise<void> {
    try {
      // Use Electron's safeStorage if available (encrypts with OS keychain)
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(token);
        (this.store as any).set('token', encrypted.toString('base64'));
      } else {
        // Fallback to electron-store encryption
        (this.store as any).set('token', token);
      }
    } catch (error) {
      console.error('Error saving token:', error);
      throw new Error('Failed to save token securely');
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const stored = (this.store as any).get('token') as string | undefined;
      if (!stored) return null;

      // Decrypt if using safeStorage
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(stored, 'base64');
          return safeStorage.decryptString(buffer);
        } catch (decryptError) {
          console.error('Decryption failed, clearing token:', decryptError);
          this.clearToken();
          return null;
        }
      }

      return stored;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  }

  clearToken(): void {
    (this.store as any).delete('token');
  }

  setUserEmail(email: string): void {
    (this.store as any).set('userEmail', email);
  }

  getUserEmail(): string | undefined {
    return (this.store as any).get('userEmail') as string | undefined;
  }

  clearAll(): void {
    (this.store as any).clear();
  }
}

export const secureStorage = new SecureStorage();
export default secureStorage;
