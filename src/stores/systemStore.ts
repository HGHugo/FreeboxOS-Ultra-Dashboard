import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { SystemInfo, RebootSchedule } from '../types/api';

interface TemperatureHistoryPoint {
  time: string;
  cpuM?: number;  // temp_cpum - CPU main
  cpuB?: number;  // temp_cpub - CPU box
  sw?: number;    // temp_sw - Switch
}

interface SystemState {
  info: SystemInfo | null;
  schedule: RebootSchedule | null;
  temperatureHistory: TemperatureHistoryPoint[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSystemInfo: () => Promise<void>;
  fetchSchedule: () => Promise<void>;
  updateSchedule: (schedule: Partial<RebootSchedule>) => Promise<boolean>;
  reboot: () => Promise<boolean>;
}

export const useSystemStore = create<SystemState>((set, get) => ({
  info: null,
  schedule: null,
  temperatureHistory: [],
  isLoading: false,
  error: null,

  fetchSystemInfo: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<SystemInfo>(API_ROUTES.SYSTEM);
      if (response.success && response.result) {
        const info = response.result;
        const { temperatureHistory } = get();

        // Build temperature history from real-time data
        // Compatible with all API versions and all Freebox models:
        // - API v8+: sensors array (Ultra, Delta, Pop, Revolution)
        // - Legacy: temp_cpu0-3 (Ultra), temp_cpum/temp_cpub/temp_sw (Delta/Rev/Pop)
        let cpuM: number | undefined;
        let sw: number | undefined;
        let cpuB: number | undefined;

        // First try sensors array (API v8+)
        if (info.sensors && Array.isArray(info.sensors) && info.sensors.length > 0) {
          // Find CPU sensors and calculate average
          const cpuSensors = info.sensors.filter(s =>
            s.id.startsWith('temp_cpu') || s.id.startsWith('cpu') || s.id === 't1'
          );
          if (cpuSensors.length > 0) {
            cpuM = Math.round(cpuSensors.reduce((sum, s) => sum + s.value, 0) / cpuSensors.length);
          }
          // Find switch/secondary sensor
          const swSensor = info.sensors.find(s =>
            s.id === 'temp_sw' || s.id === 'sw' || s.id === 't2'
          );
          if (swSensor) sw = swSensor.value;
          // Find CPU box sensor
          const cpubSensor = info.sensors.find(s => s.id === 'temp_cpub' || s.id === 'cpub');
          if (cpubSensor) cpuB = cpubSensor.value;
        }

        // Fallback to legacy flat fields if sensors array didn't provide data
        if (cpuM == null) {
          if (info.temp_cpu0 != null) {
            // Ultra: average of 4 CPU cores
            const temps = [info.temp_cpu0, info.temp_cpu1, info.temp_cpu2, info.temp_cpu3]
              .filter((t): t is number => t != null);
            cpuM = temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : undefined;
          } else if (info.temp_cpum != null) {
            // Delta/Revolution: temp_cpum field
            cpuM = info.temp_cpum;
          }
        }
        if (sw == null) sw = info.temp_sw;
        if (cpuB == null) cpuB = info.temp_cpub;

        const newPoint: TemperatureHistoryPoint = {
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpuM,   // CPU average or main temperature
          cpuB,   // CPU box temperature
          sw      // Switch temperature
        };

        // Keep last 60 points (about 30 minutes at 30s polling interval)
        const newHistory = [...temperatureHistory.slice(-59), newPoint];

        set({ info, temperatureHistory: newHistory, isLoading: false });
      } else {
        set({
          isLoading: false,
          error: response.error?.message || 'Failed to fetch system info'
        });
      }
    } catch {
      set({ isLoading: false, error: 'Failed to fetch system info' });
    }
  },

  fetchSchedule: async () => {
    try {
      const response = await api.get<RebootSchedule>(API_ROUTES.SYSTEM_REBOOT_SCHEDULE);
      if (response.success && response.result) {
        set({ schedule: response.result });
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    }
  },

  updateSchedule: async (schedule: Partial<RebootSchedule>) => {
    try {
      const response = await api.post<RebootSchedule>(API_ROUTES.SYSTEM_REBOOT_SCHEDULE, schedule);
      if (response.success && response.result) {
        set({ schedule: response.result });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update schedule:', error);
      return false;
    }
  },

  reboot: async () => {
    try {
      const response = await api.post(API_ROUTES.SYSTEM_REBOOT);
      return response.success;
    } catch {
      set({ error: 'Reboot failed' });
      return false;
    }
  }
}));