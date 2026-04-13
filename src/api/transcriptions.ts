import apiClient from './client';
import FormData from 'form-data';

export interface TranscriptionCorrectionResponse {
  transcription: string;
  correctedText: string;
}

export const transcriptionsApi = {
  async transcribeAndCorrect(audioBuffer: Buffer, language: string = 'pt'): Promise<TranscriptionCorrectionResponse> {
    const form = new FormData();
    form.append('audio', audioBuffer, { filename: 'recording.webm', contentType: 'audio/webm' });
    form.append('language', language);

    const response = await apiClient.getClient().post<TranscriptionCorrectionResponse>(
      '/transcriptions/correct',
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
        timeout: 60000,
      },
    );

    if (response.status >= 400) {
      const msg = response.data && typeof response.data === 'object' && 'message' in response.data
        ? (response.data as any).message
        : 'Erro ao transcrever áudio';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }

    return response.data;
  },
};
