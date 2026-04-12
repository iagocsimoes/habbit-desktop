import apiClient from './client';
import { LoginResponse, UserResponse, CorrectionStyle } from '../types';

export const authApi = {
  async login(email: string, password: string): Promise<string> {
    const response = await apiClient.getClient().post('/auth/login', {
      email,
      password,
    });

    if (response.status >= 400) {
      const msg = response.data?.message || response.data?.error || 'Erro ao fazer login';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }

    const token = response.data?.accessToken || response.data?.token;
    if (!token) {
      throw new Error('Resposta inválida do servidor');
    }
    return token;
  },

  async getCurrentUser(): Promise<UserResponse> {
    const response = await apiClient.getClient().get('/auth/me');

    if (response.status >= 400) {
      const msg = response.data?.message || response.data?.error || 'Erro ao obter usuário';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }

    const data = response.data;
    // Handle both { user: {...} } and direct user object
    const user = data?.user || data;
    if (!user || !user.email) {
      throw new Error('Resposta inválida do servidor');
    }
    return { user };
  },

  async updateShortcut(shortcut: string): Promise<void> {
    await apiClient.getClient().put('/auth/shortcut', { shortcut });
  },

  async updateCorrectionStyle(style: CorrectionStyle): Promise<void> {
    await apiClient.getClient().put('/auth/correction-style', { style });
  },
};
