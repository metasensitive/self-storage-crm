import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiError, ApiErrorBody } from './types';

export const TOKEN_STORAGE_KEY = 'storehaus.token';

function resolveBaseURL(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && fromEnv.length > 0) {
    return `${fromEnv.replace(/\/$/, '')}/api/v1`;
  }
  return '/api/v1';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

function toApiError(err: AxiosError<ApiErrorBody>): ApiError {
  const status = err.response?.status ?? 0;
  const body: ApiErrorBody = err.response?.data ?? {
    message: err.message || 'Сетевая ошибка',
  };
  const apiError = new Error(body.message) as ApiError;
  apiError.name = 'ApiError';
  apiError.status = status;
  apiError.body = body;
  return apiError;
}

export const api: AxiosInstance = axios.create({
  baseURL: resolveBaseURL(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/forgot-password');

    if (status === 401 && !isAuthEndpoint) {
      setToken(null);
      onUnauthorized?.();
    }

    return Promise.reject(toApiError(error));
  },
);

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && err.name === 'ApiError';
}

export function getValidationErrors(err: unknown): Record<string, string[]> | undefined {
  return isApiError(err) ? err.body.errors : undefined;
}
