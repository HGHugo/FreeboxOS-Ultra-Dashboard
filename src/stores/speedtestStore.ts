import { create } from 'zustand';
import { api } from '../api/client';

interface SpeedtestResult {
  id: string;
  timestamp: number;
  downloadSpeed: number; // in Gbps
  uploadSpeed: number;   // in Gbps
  ping: number;          // in ms
  jitter: number;        // in ms
  packetLoss: number;    // in %
  downloadHistory: number[];
  uploadHistory: number[];
}

interface SpeedtestApiResponse {
  timestamp: number;
  ping: {
    target: string;
    latency: number;
    jitter: number;
    packetLoss: number;
  };
  download: {
    average: number;
    peak: number;
    max: number;
    samples: number[];
  };
  upload: {
    average: number;
    peak: number;
    max: number;
    samples: number[];
  };
}

interface SpeedtestState {
  isRunning: boolean;
  progress: number;
  currentResult: SpeedtestResult | null;
  history: SpeedtestResult[];
  downloadSamples: number[];
  uploadSamples: number[];
  error: string | null;

  // Actions
  runSpeedtest: () => Promise<void>;
  fetchLastResults: () => void;
}

// Generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export const useSpeedtestStore = create<SpeedtestState>((set, get) => ({
  isRunning: false,
  progress: 0,
  currentResult: null,
  history: [],
  downloadSamples: [],
  uploadSamples: [],
  error: null,

  runSpeedtest: async () => {
    set({ isRunning: true, progress: 0, error: null, downloadSamples: [], uploadSamples: [] });

    try {
      // Simulate progress while waiting for backend
      const progressInterval = setInterval(() => {
        set(state => ({
          progress: Math.min(state.progress + 10, 90)
        }));
      }, 500);

      // Call the real speedtest backend endpoint
      const response = await api.post<SpeedtestApiResponse>('/api/speedtest/run', {
        pingTarget: '8.8.8.8',
        samples: 10
      });

      clearInterval(progressInterval);

      if (response.success && response.result) {
        const data = response.result;

        // Create result from API response
        const result: SpeedtestResult = {
          id: generateId(),
          timestamp: data.timestamp,
          downloadSpeed: data.download.average,
          uploadSpeed: data.upload.average,
          ping: data.ping.latency,
          jitter: data.ping.jitter,
          packetLoss: data.ping.packetLoss,
          downloadHistory: data.download.samples,
          uploadHistory: data.upload.samples
        };

        // Save to history (keep last 10)
        const { history } = get();
        const newHistory = [result, ...history].slice(0, 10);

        // Save to localStorage
        try {
          localStorage.setItem('speedtest_history', JSON.stringify(newHistory));
        } catch {
          // Ignore localStorage errors
        }

        set({
          isRunning: false,
          progress: 100,
          currentResult: result,
          history: newHistory,
          downloadSamples: data.download.samples,
          uploadSamples: data.upload.samples
        });
      } else {
        throw new Error('Speedtest failed');
      }
    } catch (error) {
      console.error('[Speedtest] Test failed:', error);
      set({
        isRunning: false,
        progress: 0,
        error: 'Erreur lors du test de débit'
      });
    }
  },

  fetchLastResults: () => {
    try {
      const stored = localStorage.getItem('speedtest_history');
      if (stored) {
        const history = JSON.parse(stored) as SpeedtestResult[];
        set({
          history,
          currentResult: history.length > 0 ? history[0] : null
        });
      }
    } catch {
      // Ignore localStorage errors
    }
  }
}));