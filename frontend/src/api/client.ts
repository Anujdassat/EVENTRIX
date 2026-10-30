import type { ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Retrieves or initializes an anonymous persistent user session ID in localStorage.
 */
export function getOrCreateSessionUserId(): string {
  const STORAGE_KEY = 'bytevox_user_session_id';
  let userId = localStorage.getItem(STORAGE_KEY);
  if (!userId) {
    userId = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY, userId);
  }
  return userId;
}

export class ApiError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: unknown;

  constructor(message: string, statusCode: number, errorCode: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const userId = getOrCreateSessionUserId();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-user-id', userId);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const body: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: {
      message: `Failed to parse response from ${endpoint}`,
      code: 'PARSE_ERROR',
      status: response.status,
    },
  }));

  if (!response.ok || !body.success) {
    const errorInfo = body.error || {
      message: response.statusText || 'Unknown network error',
      code: 'NETWORK_ERROR',
      status: response.status,
    };
    throw new ApiError(errorInfo.message, errorInfo.status, errorInfo.code, errorInfo.details);
  }

  return body.data as T;
}
