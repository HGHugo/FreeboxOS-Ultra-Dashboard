import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { Download, DownloadStats, DownloadTracker, DownloadPeer, DownloadFile, DownloadBlacklistEntry } from '../types/api';
import type { DownloadTask } from '../types';

interface DownloadsState {
  tasks: DownloadTask[];
  stats: DownloadStats | null;
  isLoading: boolean;
  hasInitialized: boolean;
  error: string | null;

  // Actions
  fetchDownloads: () => Promise<void>;
  fetchStats: () => Promise<void>;
  addDownload: (url: string, downloadDir?: string) => Promise<boolean>;
  addDownloadFromFile: (fileBase64: string, filename: string, downloadDir?: string) => Promise<boolean>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  deleteDownload: (id: string, deleteFiles?: boolean) => Promise<void>;
  getTrackers: (id: string) => Promise<DownloadTracker[]>;
  getPeers: (id: string) => Promise<DownloadPeer[]>;
  getFiles: (id: string) => Promise<DownloadFile[]>;
  updateFilePriority: (taskId: string, fileId: string, priority: string) => Promise<boolean>;
  getPieces: (id: string) => Promise<string>;
  getBlacklist: (id: string) => Promise<DownloadBlacklistEntry[]>;
  emptyBlacklist: (id: string) => Promise<boolean>;
  getLog: (id: string) => Promise<string>;
}

// Map API status to UI status
const mapStatus = (status: Download['status']): DownloadTask['status'] => {
  const statusMap: Record<Download['status'], DownloadTask['status']> = {
    queued: 'queued',
    starting: 'downloading',
    downloading: 'downloading',
    stopping: 'paused',
    stopped: 'paused',
    error: 'error',
    done: 'done',
    checking: 'downloading',
    repairing: 'downloading',
    extracting: 'downloading',
    seeding: 'seeding',
    retry: 'downloading'
  };
  return statusMap[status] || 'downloading';
};

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  tasks: [],
  stats: null,
  isLoading: false,
  hasInitialized: false,
  error: null,

  fetchDownloads: async () => {
    // Only show loading on first fetch to avoid flickering
    const { hasInitialized } = get();
    if (!hasInitialized) {
      set({ isLoading: true });
    }

    try {
      const response = await api.get<Download[]>(API_ROUTES.DOWNLOADS);

      if (response.success && response.result) {
        const tasks: DownloadTask[] = response.result.map((dl) => ({
          id: dl.id.toString(),
          name: dl.name,
          size: dl.size,
          downloaded: dl.rx_bytes,
          uploaded: dl.tx_bytes,
          progress: dl.size > 0 ? Math.round((dl.rx_bytes / dl.size) * 100) : 0,
          downloadSpeed: dl.rx_rate,
          uploadSpeed: dl.tx_rate,
          eta: dl.eta,
          status: mapStatus(dl.status)
        }));

        set({ tasks, isLoading: false, hasInitialized: true });
      } else {
        set({ isLoading: false, hasInitialized: true, error: response.error?.message });
      }
    } catch {
      set({ isLoading: false, hasInitialized: true, error: 'Failed to fetch downloads' });
    }
  },

  fetchStats: async () => {
    try {
      const response = await api.get<DownloadStats>(API_ROUTES.DOWNLOADS_STATS);
      if (response.success && response.result) {
        set({ stats: response.result });
      }
    } catch {
      set({ error: 'Failed to fetch download stats' });
    }
  },

  addDownload: async (url: string, downloadDir?: string) => {
    try {
      const response = await api.post(API_ROUTES.DOWNLOADS, { url, downloadDir });
      if (response.success) {
        // Refresh downloads list
        const store = useDownloadsStore.getState();
        store.fetchDownloads();
        return true;
      }
      return false;
    } catch {
      set({ error: 'Failed to add download' });
      return false;
    }
  },

  addDownloadFromFile: async (fileBase64: string, filename: string, downloadDir?: string) => {
    try {
      const response = await api.post(API_ROUTES.DOWNLOADS, { fileBase64, filename, downloadDir });
      if (response.success) {
        // Refresh downloads list
        const store = useDownloadsStore.getState();
        store.fetchDownloads();
        return true;
      }
      return false;
    } catch {
      set({ error: 'Failed to add download from file' });
      return false;
    }
  },

  pauseDownload: async (id: string) => {
    try {
      await api.put(`${API_ROUTES.DOWNLOADS}/${id}`, { status: 'stopped' });
      const store = useDownloadsStore.getState();
      store.fetchDownloads();
    } catch {
      set({ error: 'Failed to pause download' });
    }
  },

  resumeDownload: async (id: string) => {
    try {
      await api.put(`${API_ROUTES.DOWNLOADS}/${id}`, { status: 'downloading' });
      const store = useDownloadsStore.getState();
      store.fetchDownloads();
    } catch {
      set({ error: 'Failed to resume download' });
    }
  },

  deleteDownload: async (id: string, deleteFiles = false) => {
    try {
      await api.delete(`${API_ROUTES.DOWNLOADS}/${id}?delete_files=${deleteFiles}`);
      const store = useDownloadsStore.getState();
      store.fetchDownloads();
    } catch {
      set({ error: 'Failed to delete download' });
    }
  },

  getTrackers: async (id: string) => {
    try {
      const response = await api.get<DownloadTracker[]>(`${API_ROUTES.DOWNLOADS}/${id}/trackers`);
      return response.success && response.result ? response.result : [];
    } catch {
      return [];
    }
  },

  getPeers: async (id: string) => {
    try {
      const response = await api.get<DownloadPeer[]>(`${API_ROUTES.DOWNLOADS}/${id}/peers`);
      return response.success && response.result ? response.result : [];
    } catch {
      return [];
    }
  },

  getFiles: async (id: string) => {
    try {
      const response = await api.get<DownloadFile[]>(`${API_ROUTES.DOWNLOADS}/${id}/files`);
      return response.success && response.result ? response.result : [];
    } catch {
      return [];
    }
  },

  updateFilePriority: async (taskId: string, fileId: string, priority: string) => {
    try {
      const response = await api.put(`${API_ROUTES.DOWNLOADS}/${taskId}/files/${fileId}`, { priority });
      return response.success;
    } catch {
      return false;
    }
  },

  getPieces: async (id: string) => {
    try {
      const response = await api.get<string>(`${API_ROUTES.DOWNLOADS}/${id}/pieces`);
      return response.success && response.result ? response.result : '';
    } catch {
      return '';
    }
  },

  getBlacklist: async (id: string) => {
    try {
      const response = await api.get<DownloadBlacklistEntry[]>(`${API_ROUTES.DOWNLOADS}/${id}/blacklist`);
      return response.success && response.result ? response.result : [];
    } catch {
      return [];
    }
  },

  emptyBlacklist: async (id: string) => {
    try {
      const response = await api.delete(`${API_ROUTES.DOWNLOADS}/${id}/blacklist/empty`);
      return response.success;
    } catch {
      return false;
    }
  },

  getLog: async (id: string) => {
    try {
      const response = await api.get<string>(`${API_ROUTES.DOWNLOADS}/${id}/log`);
      return response.success && response.result ? response.result : '';
    } catch {
      return '';
    }
  }
}));