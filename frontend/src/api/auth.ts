import { api } from './client';
import type { AuthUser } from './types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface MessageResponse {
  message: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', payload).then((r) => r.data),

  logout: () => api.post<MessageResponse>('/auth/logout').then((r) => r.data),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    api.post<MessageResponse>('/auth/forgot-password', payload).then((r) => r.data),

  resetPassword: (payload: ResetPasswordPayload) =>
    api.post<MessageResponse>('/auth/reset-password', payload).then((r) => r.data),
};
