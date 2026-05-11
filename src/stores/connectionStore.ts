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
  rrdPermissionDenied: boolean;     // True if RRD access is denied (missing "settings" permission)

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
  rrdPermissionDenied: false,

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

      // Check for permission denied error
      if (!response.success) {
        const resp = response as {
          msg?: string;
          error_code?: string;
          missing_right?: string;
          error?: { code?: string; message?: string };
        };
        console.log('[ConnectionStore] Error response:', resp);

        const isPermissionDenied =
          resp.error?.code === 'INSUFFICIENT_RIGHTS' ||
          resp.error_code === 'insufficient_rights' ||
          resp.missing_right === 'settings' ||
          (resp.msg && (resp.msg.includes('autorisée') || resp.msg.includes('permission'))) ||
          (resp.error?.message && resp.error.message.includes('autorisée'));

        if (isPermissionDenied) {
          console.log('[ConnectionStore] RRD permission denied detected');
          set({ extendedHistory: [], isLoading: false, rrdPermissionDenied: true });
          return;
        }
      }

      if (response.success && response.result && response.result.data) {
        const data = response.result.data;
        console.log('[ConnectionStore] Raw data points:', data.length, 'first:', JSON.stringify(data[0]));

        // RRD 'net' database field names vary by API version and model:
        // API v4+: rate_down, rate_up (bytes/s)
        // API v8+: bw_down, bw_up (bytes/s)
        // Some versions: down, up (bytes/s)
        // Some versions: rx_rate, tx_rate (might be different scale)
        const extendedHistory: NetworkStat[] = data.map((point) => {
          // Try all known field name variations for download
          let download = point.rate_down ?? point.bw_down ?? point.down ?? point.rx_rate ?? 0;
          // Try all known field name variations for upload
          let upload = point.rate_up ?? point.bw_up ?? point.up ?? point.tx_rate ?? 0;

          // Ensure we have numbers
          download = typeof download === 'number' ? download : 0;
          upload = typeof upload === 'number' ? upload : 0;

          return {
            time: new Date(point.time * 1000).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            download: Math.round(download / 1024),
            upload: Math.round(upload / 1024)
          };
        });
        console.log('[ConnectionStore] Processed history:', extendedHistory.length, 'points');
        console.log('[ConnectionStore] First 3 data points:', extendedHistory.slice(0, 3));
        console.log('[ConnectionStore] Stats - avgDown:', Math.round(extendedHistory.reduce((sum, p) => sum + p.download, 0) / extendedHistory.length), 'KB/s');
        set({ extendedHistory, isLoading: false, rrdPermissionDenied: false });
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
      console.log('[ConnectionStore] Fetching temperature history from', start, 'to', now);
      const response = await api.get<RrdResponse>(
        `${API_ROUTES.CONNECTION_TEMP_HISTORY}?start=${start}&end=${now}`
      );
      console.log('[ConnectionStore] Temperature response:', response);

      if (response.success && response.result && response.result.data) {
        console.log('[ConnectionStore] Temperature data points:', response.result.data.length, 'first:', JSON.stringify(response.result.data[0]));
        // RRD temp database fields vary by model:
        // Ultra v9: temp_cpu0, temp_cpu1, temp_cpu2, temp_cpu3
        // Delta: cpum, cpub, sw, fan_speed
        // Pop: t1 (or possibly cpum)
        // Revolution: cpum, cpub, sw
        const temperatureHistory = response.result.data.map((point: Record<string, unknown>) => {
          let cpuM: number | undefined;

          // Try different CPU temperature field names
          if (point.temp_cpu0 != null) {
            // Ultra v9: average of 4 CPU cores
            const temps = [
              point.temp_cpu0 as number,
              point.temp_cpu1 as number,
              point.temp_cpu2 as number,
              point.temp_cpu3 as number
            ].filter(t => t != null);
            cpuM = temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : undefined;
          } else if (point.cpum != null) {
            // Delta/Revolution: cpum field
            cpuM = point.cpum as number;
          } else if (point.t1 != null) {
            // Pop: t1 field (main temperature sensor)
            cpuM = point.t1 as number;
          } else if (point.temp != null) {
            // Fallback: generic temp field
            cpuM = point.temp as number;
          }

          // Try different switch/other temperature field names
          let sw: number | undefined = point.sw as number | undefined;
          if (sw == null && point.t2 != null) {
            // Pop: t2 might be another sensor
            sw = point.t2 as number;
          }

          return {
            time: new Date((point.time as number) * 1000).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            cpuM,  // CPU main or average of CPU cores
            cpuB: point.cpub as number | undefined,  // CPU box (Delta/Revolution)
            sw     // Switch (Delta/Revolution) or secondary temp (Pop)
          };
        });
        console.log('[ConnectionStore] Processed temperature:', temperatureHistory.length, 'points, sample:', temperatureHistory[0]);
        set({ temperatureHistory });
      } else {
        console.log('[ConnectionStore] No temperature data, success:', response.success, 'result:', response.result);
      }
    } catch (err) {
      console.error('[ConnectionStore] Temperature fetch error:', err);
    }
  }
}));