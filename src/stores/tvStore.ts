import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { TvChannel, TvBouquet, PvrRecording, PvrProgrammed, PvrConfig } from '../types/api';

interface TvState {
  channels: TvChannel[];
  bouquets: TvBouquet[];
  recordings: PvrRecording[];
  programmed: PvrProgrammed[];
  pvrConfig: PvrConfig | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchChannels: () => Promise<void>;
  fetchBouquets: () => Promise<void>;
  fetchRecordings: () => Promise<void>;
  fetchProgrammed: () => Promise<void>;
  fetchPvrConfig: () => Promise<void>;
  deleteProgrammed: (id: number) => Promise<boolean>;
  deleteRecording: (id: number) => Promise<boolean>;
  createProgrammed: (data: Partial<PvrProgrammed>) => Promise<boolean>;
  updatePvrConfig: (config: Partial<PvrConfig>) => Promise<boolean>;
}

export const useTvStore = create<TvState>((set, get) => ({
  channels: [],
  bouquets: [],
  recordings: [],
  programmed: [],
  pvrConfig: null,
  isLoading: false,
  error: null,

  fetchChannels: async () => {
    const { channels: existing } = get();
    if (existing.length === 0) {
      set({ isLoading: true });
    }

    try {
      const response = await api.get<TvChannel[]>(API_ROUTES.TV_CHANNELS);
      if (response.success && response.result) {
        set({ channels: response.result, isLoading: false, error: null });
      } else {
        // Silently fail - TV channels may not be available
        set({ channels: [], isLoading: false, error: null });
      }
    } catch {
      set({ channels: [], isLoading: false, error: null });
    }
  },

  fetchBouquets: async () => {
    try {
      const response = await api.get<TvBouquet[]>(API_ROUTES.TV_BOUQUETS);
      if (response.success && response.result) {
        set({ bouquets: response.result });
      }
    } catch {
      // Silently fail
    }
  },

  fetchRecordings: async () => {
    const { recordings: existing } = get();
    if (existing.length === 0) {
      set({ isLoading: true });
    }

    try {
      const response = await api.get<PvrRecording[]>(API_ROUTES.TV_RECORDINGS);
      if (response.success && response.result) {
        // Sort by start time (newest first)
        const sorted = response.result.sort((a, b) => b.start - a.start);
        set({ recordings: sorted, isLoading: false, error: null });
      } else {
        // Handle API errors gracefully - may return empty if no disk/PVR disabled
        set({ recordings: [], isLoading: false, error: null });
      }
    } catch {
      set({ recordings: [], isLoading: false, error: null });
    }
  },

  fetchProgrammed: async () => {
    try {
      const response = await api.get<PvrProgrammed[]>(API_ROUTES.TV_PROGRAMMED);
      if (response.success && response.result) {
        // Sort by start time (soonest first)
        const sorted = response.result.sort((a, b) => a.start - b.start);
        set({ programmed: sorted, error: null });
      } else {
        set({ programmed: [], error: null });
      }
    } catch {
      set({ programmed: [], error: null });
    }
  },

  fetchPvrConfig: async () => {
    try {
      const response = await api.get<PvrConfig>(API_ROUTES.TV_PVR_CONFIG);
      if (response.success && response.result) {
        set({ pvrConfig: response.result });
      }
    } catch {
      // Silently fail - PVR may not be configured
    }
  },

  deleteProgrammed: async (id: number) => {
    try {
      const response = await api.delete(`${API_ROUTES.TV_PROGRAMMED}/${id}`);
      if (response.success) {
        const { programmed } = get();
        set({ programmed: programmed.filter(p => p.id !== id) });
        return true;
      }
      return false;
    } catch {
      set({ error: "Échec de la suppression de l'enregistrement programmé" });
      return false;
    }
  },

  deleteRecording: async (id: number) => {
    try {
      const response = await api.delete(`${API_ROUTES.TV_RECORDINGS}/${id}`);
      if (response.success) {
        const { recordings } = get();
        set({ recordings: recordings.filter(r => r.id !== id) });
        return true;
      }
      return false;
    } catch {
      set({ error: "Échec de la suppression de l'enregistrement" });
      return false;
    }
  },

  createProgrammed: async (data: Partial<PvrProgrammed>) => {
    try {
      const response = await api.post(API_ROUTES.TV_PROGRAMMED, data);
      if (response.success) {
        // Refresh programmed list
        get().fetchProgrammed();
        return true;
      }
      return false;
    } catch {
      set({ error: "Échec de la création de l'enregistrement programmé" });
      return false;
    }
  },

  updatePvrConfig: async (config: Partial<PvrConfig>) => {
    try {
      const response = await api.put<PvrConfig>(API_ROUTES.TV_PVR_CONFIG, config);
      if (response.success && response.result) {
        set({ pvrConfig: response.result });
        return true;
      }
      return false;
    } catch {
      set({ error: "Échec de la mise à jour de la configuration PVR" });
      return false;
    }
  }
}));