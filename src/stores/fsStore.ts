import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';

export interface FsFile {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size: number;
  modification: number;
  mimetype?: string;
  index?: number;
  hidden?: boolean;
  foldercount?: number;
  filecount?: number;
}

export interface StorageInfo {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
}

export interface DiskInfo {
  id: number;
  state: string;
  type: string;
  model: string;
  serial: string;
  firmware: string;
  total_bytes: number;
  partitions?: {
    id: number;
    path: string;
    label: string;
    fstype: string;
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
  }[];
}

interface FsState {
  // Current directory content
  files: FsFile[];
  currentPath: string;

  // Storage info
  storage: StorageInfo | null;
  disks: DiskInfo[];

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedFiles: string[];

  // Actions
  listFiles: (path?: string) => Promise<void>;
  navigateTo: (path: string) => Promise<void>;
  navigateUp: () => Promise<void>;
  getFileInfo: (path: string) => Promise<FsFile | null>;
  createDirectory: (dirname: string) => Promise<boolean>;
  rename: (oldPath: string, newName: string) => Promise<boolean>;
  deleteFiles: (paths: string[]) => Promise<boolean>;
  copyFiles: (paths: string[], destination: string) => Promise<boolean>;
  moveFiles: (paths: string[], destination: string) => Promise<boolean>;
  fetchStorage: () => Promise<void>;
  fetchDisks: () => Promise<void>;
  selectFile: (path: string) => void;
  deselectFile: (path: string) => void;
  toggleSelectFile: (path: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
}

export const useFsStore = create<FsState>((set, get) => ({
  files: [],
  currentPath: '/',
  storage: null,
  disks: [],
  isLoading: false,
  error: null,
  selectedFiles: [],

  listFiles: async (path?: string) => {
    const targetPath = path ?? get().currentPath;
    set({ isLoading: true, error: null });

    try {
      const response = await api.get<FsFile[]>(`${API_ROUTES.FS}/list?path=${encodeURIComponent(targetPath)}`);
      if (response.success && response.result) {
        // Sort: directories first, then by name
        const sorted = [...response.result].sort((a, b) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });
        set({ files: sorted, currentPath: targetPath, isLoading: false, selectedFiles: [] });
      } else {
        // No disk or no access - just show empty list without error
        set({ files: [], currentPath: targetPath, isLoading: false, error: null });
      }
    } catch {
      // Silently fail - show empty directory if no disk
      set({ files: [], currentPath: targetPath, isLoading: false, error: null });
    }
  },

  navigateTo: async (path: string) => {
    await get().listFiles(path);
  },

  navigateUp: async () => {
    const { currentPath } = get();
    if (currentPath === '/') return;

    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');
    await get().listFiles(newPath || '/');
  },

  getFileInfo: async (path: string) => {
    try {
      const response = await api.get<FsFile>(`${API_ROUTES.FS}/info?path=${encodeURIComponent(path)}`);
      return response.success && response.result ? response.result : null;
    } catch {
      return null;
    }
  },

  createDirectory: async (dirname: string) => {
    const { currentPath, listFiles } = get();
    try {
      const response = await api.post(`${API_ROUTES.FS}/mkdir`, { parent: currentPath, dirname });
      if (response.success) {
        await listFiles();
        return true;
      }
      set({ error: response.error?.message || 'Erreur lors de la création du dossier' });
      return false;
    } catch {
      set({ error: 'Erreur lors de la création du dossier' });
      return false;
    }
  },

  rename: async (oldPath: string, newName: string) => {
    const { listFiles } = get();
    // Construct new path
    const parts = oldPath.split('/');
    parts.pop();
    const newPath = parts.join('/') + '/' + newName;

    try {
      const response = await api.post(`${API_ROUTES.FS}/rename`, { src: oldPath, dst: newPath });
      if (response.success) {
        await listFiles();
        return true;
      }
      set({ error: response.error?.message || 'Erreur lors du renommage' });
      return false;
    } catch {
      set({ error: 'Erreur lors du renommage' });
      return false;
    }
  },

  deleteFiles: async (paths: string[]) => {
    const { listFiles } = get();
    try {
      const response = await api.post(`${API_ROUTES.FS}/remove`, { files: paths });
      if (response.success) {
        await listFiles();
        set({ selectedFiles: [] });
        return true;
      }
      set({ error: response.error?.message || 'Erreur lors de la suppression' });
      return false;
    } catch {
      set({ error: 'Erreur lors de la suppression' });
      return false;
    }
  },

  copyFiles: async (paths: string[], destination: string) => {
    const { listFiles } = get();
    try {
      const response = await api.post(`${API_ROUTES.FS}/copy`, { files: paths, dst: destination, mode: 'overwrite' });
      if (response.success) {
        await listFiles();
        return true;
      }
      set({ error: response.error?.message || 'Erreur lors de la copie' });
      return false;
    } catch {
      set({ error: 'Erreur lors de la copie' });
      return false;
    }
  },

  moveFiles: async (paths: string[], destination: string) => {
    const { listFiles } = get();
    try {
      const response = await api.post(`${API_ROUTES.FS}/move`, { files: paths, dst: destination, mode: 'overwrite' });
      if (response.success) {
        await listFiles();
        set({ selectedFiles: [] });
        return true;
      }
      set({ error: response.error?.message || 'Erreur lors du déplacement' });
      return false;
    } catch {
      set({ error: 'Erreur lors du déplacement' });
      return false;
    }
  },

  fetchStorage: async () => {
    try {
      const response = await api.get<StorageInfo>(`${API_ROUTES.FS}/storage`);
      if (response.success && response.result) {
        set({ storage: response.result });
      }
    } catch {
      // Silently fail - storage info is optional
    }
  },

  fetchDisks: async () => {
    try {
      const response = await api.get<DiskInfo[]>(`${API_ROUTES.FS}/disks`);
      if (response.success && response.result) {
        set({ disks: response.result });
      }
    } catch {
      // Silently fail - disk info is optional
    }
  },

  selectFile: (path: string) => {
    const { selectedFiles } = get();
    if (!selectedFiles.includes(path)) {
      set({ selectedFiles: [...selectedFiles, path] });
    }
  },

  deselectFile: (path: string) => {
    const { selectedFiles } = get();
    set({ selectedFiles: selectedFiles.filter(p => p !== path) });
  },

  toggleSelectFile: (path: string) => {
    const { selectedFiles } = get();
    if (selectedFiles.includes(path)) {
      set({ selectedFiles: selectedFiles.filter(p => p !== path) });
    } else {
      set({ selectedFiles: [...selectedFiles, path] });
    }
  },

  clearSelection: () => {
    set({ selectedFiles: [] });
  },

  selectAll: () => {
    const { files } = get();
    set({ selectedFiles: files.map(f => f.path) });
  }
}));