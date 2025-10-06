import apiClient from './client';
import { CorrectionResponse, CorrectionsListResponse, StatsResponse, Correction } from '../types';

export const correctionsApi = {
  async createCorrection(text: string, language: string = 'pt'): Promise<CorrectionResponse> {
    const response = await apiClient.getClient().post<CorrectionResponse>('/corrections', {
      text,
      language,
    });
    return response.data;
  },

  async getCorrections(page: number = 1, perPage: number = 20): Promise<CorrectionsListResponse> {
    const response = await apiClient.getClient().get<CorrectionsListResponse>('/corrections', {
      params: { page, perPage },
    });
    return response.data;
  },

  async getStats(): Promise<StatsResponse> {
    const response = await apiClient.getClient().get<StatsResponse>('/corrections/stats');
    return response.data;
  },

  async getCorrection(id: string): Promise<{ correction: Correction }> {
    const response = await apiClient.getClient().get<{ correction: Correction }>(`/corrections/${id}`);
    return response.data;
  },

  async deleteCorrection(id: string): Promise<void> {
    await apiClient.getClient().delete(`/corrections/${id}`);
  },

};
