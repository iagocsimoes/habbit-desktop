import apiClient from './client';

export type SummaryStyle = 'bullets' | 'paragraph' | 'oneline' | 'detailed';

export interface SummaryResponse {
  summary: {
    id: string;
    originalText: string;
    summaryText: string;
    style: SummaryStyle;
    language: string;
    tokensUsed: number;
    createdAt: string;
  };
  usage: {
    monthly: number;
    limit: number;
    remaining: number;
  };
}

export const summariesApi = {
  async createSummary(text: string, language: string = 'pt', style: SummaryStyle = 'bullets'): Promise<SummaryResponse> {
    const response = await apiClient.getClient().post<SummaryResponse>('/summaries', {
      text,
      language,
      style,
    });

    if (response.status >= 400) {
      const msg = (response.data as any)?.message || 'Erro ao resumir texto';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }

    return response.data;
  },
};
