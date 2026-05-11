import type { ApiResponse } from '../types/api';
import { useAuthStore } from '../stores/authStore';
import { PERMISSION_LABELS } from '../utils/permissions';

// Extended response type for Freebox API errors
interface FreeboxErrorResponse {
  success: false;
  error_code?: string;
  missing_right?: string;
  msg?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      // Check for Freebox auth_required error (session expired or permissions changed)
      if (data && !data.success && data.error_code === 'auth_required') {
        console.warn(`[API] Auth required for ${method} ${endpoint}: session expired or permissions changed`);

        // Mark user as logged out and trigger re-authentication
        useAuthStore.getState().handleSessionExpired();

        return {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Votre session a expiré. Reconnexion en cours...'
          }
        };
      }

      // Check for Freebox insufficient_rights error
      if (data && !data.success && data.error_code === 'insufficient_rights' && data.missing_right) {
        const freeboxError = data as FreeboxErrorResponse;
        const missingRight = freeboxError.missing_right;
        const permissionLabel = PERMISSION_LABELS[missingRight] || missingRight;

        console.warn(`[API] Insufficient rights for ${method} ${endpoint}: missing "${missingRight}"`);

        // Update the permission in the auth store
        useAuthStore.getState().updatePermissionFromError(missingRight);

        return {
          success: false,
          error: {
            code: 'INSUFFICIENT_RIGHTS',
            message: `Cette application n'est pas autorisée à accéder à cette fonction. Permission manquante : "${permissionLabel}"`
          }
        };
      }

      // Check for Freebox deprecated API error
      if (data && !data.success && data.error_code === 'deprecated') {
        console.warn(`[API] Deprecated API for ${method} ${endpoint}: ${data.msg}`);

        return {
          success: false,
          error: {
            code: 'DEPRECATED',
            message: data.msg || 'Cette fonctionnalité n\'est plus disponible'
          }
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || data.error_code || 'REQUEST_FAILED',
            message: data.error?.message || data.msg || `Request failed with status ${response.status}`
          }
        };
      }

      return data as ApiResponse<T>;
    } catch (error) {
      console.error(`[API] ${method} ${endpoint} failed:`, error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body);
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }
}

export const api = new ApiClient();