import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { AuthStatus, RegistrationStatus, Permissions } from '../types/api';

interface AuthState {
  isRegistered: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  isRegistering: boolean;
  trackId: number | null;
  registrationStatus: RegistrationStatus['status'] | null;
  permissions: Permissions;
  error: string | null;
  freeboxUrl: string;

  // Actions
  checkAuth: () => Promise<void>;
  register: () => Promise<void>;
  checkRegistrationStatus: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setFreeboxUrl: (url: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isRegistered: false,
  isLoggedIn: false,
  isLoading: true,
  isRegistering: false,
  trackId: null,
  registrationStatus: null,
  permissions: {},
  error: null,
  freeboxUrl: 'https://mafreebox.freebox.fr',

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<AuthStatus>(API_ROUTES.AUTH_CHECK);
      if (response.success && response.result) {
        set({
          isRegistered: response.result.isRegistered,
          isLoggedIn: response.result.isLoggedIn,
          permissions: response.result.permissions,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false, error: 'Failed to check auth status' });
    }
  },

  register: async () => {
    set({ isRegistering: true, error: null, registrationStatus: 'pending' });
    try {
      const response = await api.post<{ trackId: number }>(API_ROUTES.AUTH_REGISTER);
      if (response.success && response.result) {
        set({
          trackId: response.result.trackId,
          registrationStatus: 'pending'
        });
        // Start polling for registration status
        get().checkRegistrationStatus();
      } else {
        set({
          isRegistering: false,
          error: response.error?.message || 'Registration failed'
        });
      }
    } catch {
      set({ isRegistering: false, error: 'Registration failed' });
    }
  },

  checkRegistrationStatus: async () => {
    const { trackId } = get();
    if (!trackId) return;

    try {
      const response = await api.get<RegistrationStatus>(
        `${API_ROUTES.AUTH_STATUS}/${trackId}`
      );
      if (response.success && response.result) {
        const status = response.result.status;
        set({ registrationStatus: status });

        if (status === 'granted') {
          set({ isRegistered: true, isRegistering: false });
          // Auto-login after registration
          get().login();
        } else if (status === 'denied' || status === 'timeout') {
          set({
            isRegistering: false,
            error: status === 'denied'
              ? 'Registration denied on Freebox'
              : 'Registration timed out'
          });
        } else if (status === 'pending') {
          // Continue polling
          setTimeout(() => get().checkRegistrationStatus(), 1000);
        }
      }
    } catch {
      set({ isRegistering: false, error: 'Failed to check registration status' });
    }
  },

  login: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{ permissions: Permissions }>(API_ROUTES.AUTH_LOGIN);
      if (response.success && response.result) {
        set({
          isLoggedIn: true,
          permissions: response.result.permissions,
          isLoading: false
        });
      } else {
        set({
          isLoading: false,
          error: response.error?.message || 'Login failed'
        });
      }
    } catch {
      set({ isLoading: false, error: 'Login failed' });
    }
  },

  logout: async () => {
    try {
      await api.post(API_ROUTES.AUTH_LOGOUT);
      set({
        isLoggedIn: false,
        permissions: {}
      });
    } catch {
      set({ error: 'Logout failed' });
    }
  },

  setFreeboxUrl: async (url: string) => {
    try {
      const response = await api.post<{ url: string }>(API_ROUTES.AUTH_SET_URL, { url });
      if (response.success) {
        set({ freeboxUrl: url });
      }
    } catch {
      set({ error: 'Failed to set Freebox URL' });
    }
  },

  clearError: () => set({ error: null })
}));