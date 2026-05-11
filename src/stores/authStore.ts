import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { AuthStatus, RegistrationStatus, Permissions } from '../types/api';
import { useCapabilitiesStore, type FreeboxCapabilities } from './capabilitiesStore';

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
  lastPermissionsRefresh: number;

  // Actions
  checkAuth: () => Promise<void>;
  register: () => Promise<void>;
  checkRegistrationStatus: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setFreeboxUrl: (url: string) => Promise<void>;
  clearError: () => void;
  refreshPermissions: () => Promise<void>;
  updatePermissionFromError: (missingRight: string) => void;
  handleSessionExpired: () => void;
  resetToken: () => Promise<void>;
}

// Permissions refresh interval (1 minute)
const PERMISSIONS_REFRESH_INTERVAL = 60 * 1000;

// LocalStorage keys
const STORAGE_KEY_FREEBOX_URL = 'freebox_dashboard_url';

// Get saved URL from localStorage or use default
const getSavedFreeboxUrl = (): string => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FREEBOX_URL);
    return saved || 'https://mafreebox.freebox.fr';
  } catch {
    return 'https://mafreebox.freebox.fr';
  }
};

// Save URL to localStorage
const saveFreeboxUrl = (url: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY_FREEBOX_URL, url);
  } catch {
    // Silently fail if localStorage is not available
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isRegistered: false,
  isLoggedIn: false,
  isLoading: true,
  isRegistering: false,
  trackId: null,
  registrationStatus: null,
  permissions: {},
  error: null,
  freeboxUrl: getSavedFreeboxUrl(),
  lastPermissionsRefresh: 0,

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<AuthStatus & { capabilities?: FreeboxCapabilities }>(API_ROUTES.AUTH_CHECK);
      if (response.success && response.result) {
        set({
          isRegistered: response.result.isRegistered,
          isLoggedIn: response.result.isLoggedIn,
          permissions: response.result.permissions,
          isLoading: false
        });
        // Store capabilities if available
        if (response.result.capabilities) {
          useCapabilitiesStore.getState().setCapabilities(response.result.capabilities);
        }
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
      const response = await api.post<{ permissions: Permissions; capabilities?: FreeboxCapabilities }>(API_ROUTES.AUTH_LOGIN);
      if (response.success && response.result) {
        set({
          isLoggedIn: true,
          permissions: response.result.permissions,
          isLoading: false
        });
        // Store capabilities if available
        if (response.result.capabilities) {
          useCapabilitiesStore.getState().setCapabilities(response.result.capabilities);
        }
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
      // Clear capabilities on logout
      useCapabilitiesStore.getState().clearCapabilities();
    } catch {
      set({ error: 'Logout failed' });
    }
  },

  setFreeboxUrl: async (url: string) => {
    try {
      const response = await api.post<{ url: string }>(API_ROUTES.AUTH_SET_URL, { url });
      if (response.success) {
        set({ freeboxUrl: url });
        // Save to localStorage for next session
        saveFreeboxUrl(url);
      }
    } catch {
      set({ error: 'Failed to set Freebox URL' });
    }
  },

  clearError: () => set({ error: null }),

  // Refresh permissions from the server
  refreshPermissions: async () => {
    const { isLoggedIn, lastPermissionsRefresh } = get();

    // Don't refresh if not logged in
    if (!isLoggedIn) return;

    // Throttle: don't refresh more than once per minute
    const now = Date.now();
    if (now - lastPermissionsRefresh < 60000) return;

    try {
      const response = await api.get<AuthStatus & { capabilities?: FreeboxCapabilities }>(API_ROUTES.AUTH_CHECK);
      if (response.success && response.result) {
        set({
          permissions: response.result.permissions,
          lastPermissionsRefresh: now
        });
        // Update capabilities if available
        if (response.result.capabilities) {
          useCapabilitiesStore.getState().setCapabilities(response.result.capabilities);
        }
      }
    } catch {
      // Silently fail - permissions will be refreshed on next successful request
    }
  },

  // Update a specific permission from an error response (mark as false)
  updatePermissionFromError: (missingRight: string) => {
    const { permissions } = get();
    // Only update if the permission was previously true or undefined
    if (permissions[missingRight] !== false) {
      set({
        permissions: {
          ...permissions,
          [missingRight]: false
        }
      });
      // Trigger a full refresh in background to get the latest permissions
      get().refreshPermissions();
    }
  },

  // Handle session expiration (auth_required error from API)
  handleSessionExpired: () => {
    const { isLoggedIn } = get();

    // Only handle if we thought we were logged in
    if (isLoggedIn) {
      console.log('[Auth] Session expired, attempting re-login...');

      // Mark as logged out temporarily
      set({
        isLoggedIn: false,
        permissions: {},
        error: null
      });

      // Attempt automatic re-login
      get().login();
    }
  },

  // Reset token (delete on server and locally) - for re-registration
  resetToken: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.post(API_ROUTES.AUTH_RESET);
      set({
        isRegistered: false,
        isLoggedIn: false,
        permissions: {},
        trackId: null,
        registrationStatus: null,
        isLoading: false,
        error: null
      });
      // Clear capabilities
      useCapabilitiesStore.getState().clearCapabilities();
      console.log('[Auth] Token reset successful');
    } catch {
      set({ isLoading: false, error: 'Failed to reset token' });
    }
  }
}));

// Start periodic permissions refresh
let permissionsRefreshInterval: ReturnType<typeof setInterval> | null = null;

export const startPermissionsRefresh = () => {
  if (permissionsRefreshInterval) return;

  permissionsRefreshInterval = setInterval(() => {
    useAuthStore.getState().refreshPermissions();
  }, PERMISSIONS_REFRESH_INTERVAL);
};

export const stopPermissionsRefresh = () => {
  if (permissionsRefreshInterval) {
    clearInterval(permissionsRefreshInterval);
    permissionsRefreshInterval = null;
  }
};