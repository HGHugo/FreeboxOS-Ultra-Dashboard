import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { ConnectionStatus, RrdResponse } from '../types/api';
import type { NetworkStat } from '../types';

interface TemperatureStat {
  time: string;
  cpuM?: number;
  cpuB?: number;
  sw?: number;
  cpu0?: number;
  cpu1?: number;
  cpu2?: number;
  cpu3?: number;
}

interface ConnectionState {
  status: ConnectionStatus | null;
  history: NetworkStat[];           // Real-time history (last 60 seconds)
  extendedHistory: NetworkStat[];   // Extended history from RRD (last hour)
  temperatureHistory: TemperatureStat[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConnectionStatus: () => Promise<void>;
  fetchExtendedHistory: (duration?: number) => Promise<void>;
  fetchTemperatureHistory: (duration?: number) => Promise<void>;
  addHistoryPoint: (download: number, upload: number) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: null,
  history: [],
  extendedHistory: [],
  temperatureHistory: [],
  isLoading: false,
  error: null,

  fetchConnectionStatus: async () => {
    try {
      const response = await api.get<ConnectionStatus>(API_ROUTES.CONNECTION);
      if (response.success && response.result) {
        const status = response.result;
        set({ status, error: null });

        // Add to history for real-time chart
        const { history } = get();
        const newPoint: NetworkStat = {
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          download: Math.round(status.rate_down / 1024), // Convert to KB/s
          upload: Math.round(status.rate_up / 1024)
        };

        // Keep last 60 points (1 minute at 1s interval)
        const newHistory = [...history.slice(-59), newPoint];
        set({ history: newHistory });
      }
    } catch {
      set({ error: 'Failed to fetch connection status' });
    }
  },

  fetchExtendedHistory: async (duration = 3600) => {
    set({ isLoading: true });
    try {
      const now = Math.floor(Date.now() / 1000);
      const start = now - duration;
      console.log('[ConnectionStore] Fetching history from', start, 'to', now);
      const response = await api.get<RrdResponse>(
        `${API_ROUTES.CONNECTION_HISTORY}?start=${start}&end=${now}`
      );
      console.log('[ConnectionStore] History response:', response);

      if (response.success && response.result && response.result.data) {
        const data = response.result.data;
        console.log('[ConnectionStore] Raw data points:', data.length, 'first:', JSON.stringify(data[0]));

        const extendedHistory: NetworkStat[] = data.map((point) => {
          // Try different field names: rate_down/rate_up or bw_down/bw_up
          const download = point.rate_down ?? point.bw_down ?? 0;
          const upload = point.rate_up ?? point.bw_up ?? 0;

          return {
            time: new Date(point.time * 1000).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            download: Math.round(download / 1024),
            upload: Math.round(upload / 1024)
          };
        });
        console.log('[ConnectionStore] Processed history:', extendedHistory.length, 'points', 'sample:', extendedHistory[0]);
        set({ extendedHistory, isLoading: false });
      } else {
        console.log('[ConnectionStore] No data in response, success:', response.success, 'result:', response.result);
        set({ extendedHistory: [], isLoading: false });
      }
    } catch (err) {
      console.error('[ConnectionStore] Error fetching history:', err);
      set({ isLoading: false, error: 'Failed to fetch history' });
    }
  },

  addHistoryPoint: (download: number, upload: number) => {
    const { history } = get();
    const newPoint: NetworkStat = {
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      download,
      upload
    };
    const newHistory = [...history.slice(-59), newPoint];
    set({ history: newHistory });
  },

  fetchTemperatureHistory: async (duration = 3600) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const start = now - duration;
      const response = await api.get<RrdResponse>(
        `${API_ROUTES.CONNECTION_TEMP_HISTORY}?start=${start}&end=${now}`
      );

      if (response.success && response.result && response.result.data) {
        const temperatureHistory = response.result.data.map((point: Record<string, unknown>) => ({
          time: new Date((point.time as number) * 1000).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          cpuM: point.temp_cpum as number | undefined,
          cpuB: point.temp_cpub as number | undefined,
          sw: point.temp_sw as number | undefined,
          cpu0: point.temp_cpu0 as number | undefined,
          cpu1: point.temp_cpu1 as number | undefined,
          cpu2: point.temp_cpu2 as number | undefined,
          cpu3: point.temp_cpu3 as number | undefined
        }));
        set({ temperatureHistory });
      }
    } catch {
      // Temperature history fetch failed silently
    }
  }
}));