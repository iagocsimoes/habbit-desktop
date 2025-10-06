import { authApi } from '../api/auth';
import apiClient from '../api/client';
import secureStorage from './storage';
import { User, CorrectionStyle } from '../types';

class AuthService {
  private currentUser: User | null = null;

  async login(email: string, password: string): Promise<User> {
    try {
      const token = await authApi.login(email, password);

      // Save token securely
      await secureStorage.setToken(token);
      secureStorage.setUserEmail(email);

      // Set token in API client
      apiClient.setToken(token);

      // Get user data
      const { user } = await authApi.getCurrentUser();
      this.currentUser = user;

      return user;
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async initializeFromStorage(): Promise<User | null> {
    try {
      const token = await secureStorage.getToken();

      if (!token) {
        return null;
      }

      // Set token in API client
      apiClient.setToken(token);

      // Try to get user data
      const { user } = await authApi.getCurrentUser();
      this.currentUser = user;

      return user;
    } catch (error) {
      // Token is invalid or expired
      console.error('Failed to initialize from storage:', error);
      await this.logout();
      return null;
    }
  }

  async logout(): Promise<void> {
    secureStorage.clearAll();
    apiClient.setToken(null);
    this.currentUser = null;
  }

  async updateShortcut(shortcut: string): Promise<void> {
    await authApi.updateShortcut(shortcut);
    if (this.currentUser) {
      this.currentUser.shortcut = shortcut;
    }
  }

  async updateCorrectionStyle(style: CorrectionStyle): Promise<void> {
    await authApi.updateCorrectionStyle(style);
    if (this.currentUser) {
      this.currentUser.correctionStyle = style;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

export const authService = new AuthService();
export default authService;
