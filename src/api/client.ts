import axios, { AxiosInstance, AxiosError } from 'axios';
import { ErrorResponse } from '../types';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private requestCount: Map<string, number> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 60;

  constructor(baseURL: string = 'http://localhost:3333') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
      },
      timeout: 30000,
      validateStatus: () => true,
      maxRedirects: 0, // Prevent redirect attacks
    });

    // Clean up old rate limit counters every minute
    setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      for (const [key, timestamp] of this.requestCount.entries()) {
        if (timestamp < oneMinuteAgo) {
          this.requestCount.delete(key);
        }
      }
    }, 60000);

    // Request interceptor to add token and rate limiting
    this.client.interceptors.request.use(
      (config) => {
        // Rate limiting check
        const endpoint = config.url || 'unknown';
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        // Count requests in the last minute
        let count = 0;
        for (const [key, timestamp] of this.requestCount.entries()) {
          if (key.startsWith(endpoint) && timestamp > oneMinuteAgo) {
            count++;
          }
        }

        if (count >= this.MAX_REQUESTS_PER_MINUTE) {
          throw new Error('Taxa de requisições excedida. Aguarde um momento.');
        }

        // Add request to counter
        this.requestCount.set(`${endpoint}_${now}`, now);

        // Add authorization token
        if (this.token && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        if (error.response) {
          const errorData = error.response.data;
          const errorMessage = Array.isArray(errorData?.message)
            ? errorData.message.join(', ')
            : errorData?.message || 'Unknown error';

          throw new Error(errorMessage);
        } else if (error.request) {
          throw new Error('No response from server. Please check your connection.');
        } else {
          throw new Error(error.message || 'Request failed');
        }
      }
    );
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  getClient(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
