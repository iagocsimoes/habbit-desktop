import apiClient from './client';
import { LoginResponse, UserResponse, CorrectionStyle } from '../types';

export const authApi = {
  async login(email: string, password: string): Promise<string> {
    const response = await apiClient.getClient().post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return response.data.accessToken;
  },

  async getCurrentUser(): Promise<UserResponse> {
    const response = await apiClient.getClient().get<UserResponse>('/auth/me');
    return response.data;
  },

  async updateShortcut(shortcut: string): Promise<void> {
    await apiClient.getClient().put('/auth/shortcut', { shortcut });
  },

  async updateCorrectionStyle(style: CorrectionStyle): Promise<void> {
    await apiClient.getClient().put('/auth/correction-style', { style });
  },
};
