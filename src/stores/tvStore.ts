import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { TvChannel, TvBouquet, PvrRecording, PvrProgrammed, PvrConfig, EpgProgram, EpgByTimeResponse } from '../types/api';

// Processed EPG entry with channel info
export interface EpgEntry extends EpgProgram {
  channelUuid: string;
  channelName?: string;
  channelLogo?: string;
  channelNumber?: number;
}

interface TvState {
  channels: TvChannel[];
  bouquets: TvBouquet[];
  recordings: PvrRecording[];
  programmed: PvrProgrammed[];
  pvrConfig: PvrConfig | null;
  epgPrograms: EpgEntry[];
  epgLoading: boolean;
  epgCache: Map<number, number>; // timestamp -> fetched time (to avoid refetching)
  epgRateLimited: boolean; // true when rate limited
  epgRateLimitedUntil: number | null; // timestamp when rate limit expires
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchChannels: () => Promise<void>;
  fetchBouquets: () => Promise<void>;
  fetchRecordings: () => Promise<void>;
  fetchProgrammed: () => Promise<void>;
  fetchPvrConfig: () => Promise<void>;
  fetchEpgByTime: (timestamp?: number, merge?: boolean) => Promise<{ rateLimited: boolean }>;
  clearEpgCache: () => void;
  clearRateLimit: () => void;
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
  epgPrograms: [],
  epgLoading: false,
  epgCache: new Map(),
  epgRateLimited: false,
  epgRateLimitedUntil: null,
  isLoading: false,
  error: null,

  fetchChannels: async () => {
    const { channels: existing } = get();
    if (existing.length === 0) {
      set({ isLoading: true });
    }

    try {
      // API returns an object { "uuid-webtv-XXX": { channel data }, ... }
      const response = await api.get<Record<string, TvChannel>>(API_ROUTES.TV_CHANNELS);
      if (response.success && response.result) {
        // Convert object to array, extract channel number from UUID, and sort
        const channelsArray = Object.values(response.result)
          .filter(ch => ch.uuid) // Filter out invalid entries
          .map(ch => {
            // Try to extract channel number from UUID (format: uuid-webtv-XXX)
            if (!ch.number) {
              const match = ch.uuid.match(/uuid-webtv-(\d+)/);
              if (match) {
                ch.number = parseInt(match[1], 10);
              }
            }
            return ch;
          })
          .sort((a, b) => (a.number || 9999) - (b.number || 9999));
        set({ channels: channelsArray, isLoading: false, error: null });
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

  fetchEpgByTime: async (timestamp?: number, merge?: boolean) => {
    const { epgRateLimited, epgRateLimitedUntil } = get();

    // Check if we're still rate limited
    if (epgRateLimited && epgRateLimitedUntil && Date.now() < epgRateLimitedUntil) {
      return { rateLimited: true };
    }

    // Clear rate limit if expired
    if (epgRateLimited && epgRateLimitedUntil && Date.now() >= epgRateLimitedUntil) {
      set({ epgRateLimited: false, epgRateLimitedUntil: null });
    }

    const ts = timestamp || Math.floor(Date.now() / 1000);
    // Round timestamp to 2-hour intervals (00:00, 02:00, 04:00, etc.) for consistent cache hits
    const EPG_INTERVAL = 2 * 60 * 60; // 2 hours
    const roundedTs = Math.floor(ts / EPG_INTERVAL) * EPG_INTERVAL;


    const { epgCache } = get();
    const now = Date.now();
    const cacheTime = epgCache.get(roundedTs);

    // Skip if already fetched within last 5 minutes
    if (cacheTime && (now - cacheTime) < 5 * 60 * 1000) {
      return { rateLimited: false };
    }

    set({ epgLoading: true });

    try {
      const response = await api.get<EpgByTimeResponse>(`${API_ROUTES.TV_EPG_BY_TIME}/${roundedTs}`);

      // Check for rate limit error
      if (!response.success && (response as { error_code?: string }).error_code === 'rate_limit') {
        // Set rate limited for 30 seconds
        set({
          epgRateLimited: true,
          epgRateLimitedUntil: Date.now() + 30 * 1000,
          epgLoading: false
        });
        return { rateLimited: true };
      }

      if (response.success && response.result) {
        const { channels, epgPrograms: existingPrograms } = get();
        const newEntries: EpgEntry[] = [];

        // Process the nested response structure
        for (const [channelUuid, programs] of Object.entries(response.result)) {
          const channel = channels.find(c => c.uuid === channelUuid);

          for (const [, program] of Object.entries(programs)) {
            newEntries.push({
              ...program,
              channelUuid,
              channelName: channel?.name,
              channelLogo: channel?.logo_url,
              channelNumber: channel?.number
            });
          }
        }

        // Merge with existing programs if requested
        let allEntries: EpgEntry[];
        if (merge && existingPrograms.length > 0) {
          // Create a map of existing programs by ID for deduplication
          const existingMap = new Map(existingPrograms.map(p => [p.id, p]));
          // Add new entries, overwriting duplicates
          newEntries.forEach(entry => existingMap.set(entry.id, entry));
          allEntries = Array.from(existingMap.values());
        } else {
          allEntries = newEntries;
        }

        // Sort by channel number, then by date
        allEntries.sort((a, b) => {
          if (a.channelNumber && b.channelNumber) {
            if (a.channelNumber !== b.channelNumber) {
              return a.channelNumber - b.channelNumber;
            }
          }
          return a.date - b.date;
        });


        // Update cache with current time
        const newCache = new Map(get().epgCache);
        newCache.set(roundedTs, Date.now());
        set({ epgPrograms: allEntries, epgLoading: false, epgCache: newCache });
        return { rateLimited: false };
      } else {
        if (!merge) {
          set({ epgPrograms: [], epgLoading: false });
        } else {
          set({ epgLoading: false });
        }
        return { rateLimited: false };
      }
    } catch {
      if (!merge) {
        set({ epgPrograms: [], epgLoading: false });
      } else {
        set({ epgLoading: false });
      }
      return { rateLimited: false };
    }
  },

  clearEpgCache: () => {
    set({ epgCache: new Map(), epgPrograms: [] });
  },

  clearRateLimit: () => {
    set({ epgRateLimited: false, epgRateLimitedUntil: null });
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