// Capabilities Store
// Stores and manages Freebox model capabilities for UI adaptation

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

// Types matching backend
export type FreeboxModel = 'ultra' | 'delta' | 'pop' | 'revolution' | 'unknown';
export type VmSupport = 'full' | 'limited' | 'none';
// @deprecated All Freebox models now use 'legacy' temperature fields (temp_cpum, temp_sw, temp_cpub)
export type TemperatureType = 'legacy';
export type BoxFlavor = 'full' | 'light';

export interface FreeboxCapabilities {
  model: FreeboxModel;
  modelName: string;
  boxFlavor: BoxFlavor;
  wifi6ghz: boolean;
  wifi7: boolean;
  vmSupport: VmSupport;
  maxVms: number;
  maxVmRam: number;
  temperatureType: TemperatureType;
  temperatureFields: string[];
  hasInternalStorage: boolean;
  maxEthernetSpeed: number;
  maxDownloadSpeed: number;
  maxUploadSpeed: number;
}

interface CapabilitiesState {
  capabilities: FreeboxCapabilities | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCapabilities: (capabilities: FreeboxCapabilities | null) => void;
  fetchCapabilities: () => Promise<void>;
  refreshCapabilities: () => Promise<void>;
  clearCapabilities: () => void;

  // Helper getters
  supportsVm: () => boolean;
  hasFullVmSupport: () => boolean;
  hasLimitedVmSupport: () => boolean;
  getMaxVms: () => number;
  supportsWifi6ghz: () => boolean;
  hasInternalStorage: () => boolean;
  getModel: () => FreeboxModel;
  getModelName: () => string;
  isUltra: () => boolean;
  isDelta: () => boolean;
  isPop: () => boolean;
}

export const useCapabilitiesStore = create<CapabilitiesState>()(
  persist(
    (set, get) => ({
      capabilities: null,
      isLoading: false,
      error: null,

      setCapabilities: (capabilities) => {
        set({ capabilities, error: null });
      },

      fetchCapabilities: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get<FreeboxCapabilities>('/api/capabilities');
          if (response.success && response.result) {
            set({ capabilities: response.result, isLoading: false });
          } else {
            set({
              isLoading: false,
              error: response.error?.message || 'Failed to fetch capabilities'
            });
          }
        } catch {
          set({ isLoading: false, error: 'Failed to fetch capabilities' });
        }
      },

      refreshCapabilities: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<FreeboxCapabilities>('/api/capabilities/refresh');
          if (response.success && response.result) {
            set({ capabilities: response.result, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false, error: 'Failed to refresh capabilities' });
        }
      },

      clearCapabilities: () => {
        set({ capabilities: null, error: null });
      },

      // Helper getters
      supportsVm: () => {
        const caps = get().capabilities;
        return caps?.vmSupport !== 'none';
      },

      hasFullVmSupport: () => {
        const caps = get().capabilities;
        return caps?.vmSupport === 'full';
      },

      hasLimitedVmSupport: () => {
        const caps = get().capabilities;
        return caps?.vmSupport === 'limited';
      },

      getMaxVms: () => {
        return get().capabilities?.maxVms ?? 0;
      },

      supportsWifi6ghz: () => {
        return get().capabilities?.wifi6ghz ?? false;
      },

      hasInternalStorage: () => {
        return get().capabilities?.hasInternalStorage ?? false;
      },

      getModel: () => {
        return get().capabilities?.model ?? 'unknown';
      },

      getModelName: () => {
        return get().capabilities?.modelName ?? 'Freebox';
      },

      isUltra: () => {
        return get().capabilities?.model === 'ultra';
      },

      isDelta: () => {
        return get().capabilities?.model === 'delta';
      },

      isPop: () => {
        return get().capabilities?.model === 'pop';
      }
    }),
    {
      name: 'freebox-capabilities',
      // Only persist the capabilities, not loading/error states
      partialize: (state) => ({ capabilities: state.capabilities })
    }
  )
);
