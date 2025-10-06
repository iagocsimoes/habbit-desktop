// API Types
export enum UserPlan {
  PRO = 'PRO'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum CorrectionStyle {
  CORRECT = 'correct',
  FORMAL = 'formal',
  INFORMAL = 'informal',
  CONCISE = 'concise',
  DETAILED = 'detailed'
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  role: UserRole;
  shortcut: string;
  correctionStyle?: CorrectionStyle;
  createdAt: string;
}

export interface TextChange {
  type: 'grammar' | 'spelling' | 'punctuation' | 'style';
  original: string;
  corrected: string;
  explanation: string;
}

export interface Correction {
  id: string;
  originalText: string;
  correctedText: string;
  changes: TextChange[] | null;
  language: string;
  tokensUsed: number;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface UserResponse {
  user: User;
}

export interface CorrectionResponse {
  correction: Correction;
  usage: {
    monthly: number;
    limit: number;
    remaining: number;
  };
}

export interface CorrectionsListResponse {
  corrections: Correction[];
}

export interface StatsResponse {
  totalCorrections: number;
  monthlyLimit: number;
  remaining: number;
  totalTokensUsed: number;
}

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
