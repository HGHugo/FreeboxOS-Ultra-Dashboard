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

export interface ShareLink {
  token: string;
  path: string;
  name: string;
  expire: number;
  fullurl: string;
}

interface FsState {
  // Current directory content
  files: FsFile[];
  currentPath: string;

  // v15 Pagination
  cursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;

  // Storage info
  storage: StorageInfo | null;
  disks: DiskInfo[];

  // Share links
  shareLinks: ShareLink[];

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedFiles: string[];

  // Actions
  listFiles: (path?: string, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
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
  // Share links
  fetchShareLinks: () => Promise<void>;
  createShareLink: (path: string, expireDays?: number) => Promise<ShareLink | null>;
  deleteShareLink: (token: string) => Promise<boolean>;
}

// Response type for v15 API (with pagination)
interface FsListResponse {
  entries?: FsFile[];
  cursor?: string;
}

export const useFsStore = create<FsState>((set, get) => ({
  files: [],
  currentPath: '/',
  cursor: null,
  hasMore: false,
  isLoadingMore: false,
  storage: null,
  disks: [],
  shareLinks: [],
  isLoading: false,
  error: null,
  selectedFiles: [],

  listFiles: async (path?: string, reset = true) => {
    const targetPath = path ?? get().currentPath;
    const { cursor: currentCursor } = get();

    // If reset, start fresh. Otherwise, use cursor for pagination
    if (reset) {
      set({ isLoading: true, error: null, cursor: null, hasMore: false });
    } else {
      set({ isLoadingMore: true });
    }

    try {
      // Build URL with optional path and cursor
      let url = `${API_ROUTES.FS}/list`;
      const params: string[] = [];

      if (targetPath !== '/' && targetPath !== '') {
        params.push(`path=${encodeURIComponent(targetPath)}`);
      }

      // Add cursor for pagination (v15+)
      if (!reset && currentCursor) {
        params.push(`cursor=${encodeURIComponent(currentCursor)}`);
      }

      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      // Response can be either array (old format) or object with entries/cursor (v15)
      const response = await api.get<FsFile[] | FsListResponse>(url);

      if (response.success && response.result) {
        let files: FsFile[];
        let newCursor: string | null = null;

        // Handle both v15 format (object with entries) and legacy format (array)
        if (Array.isArray(response.result)) {
          files = response.result;
        } else {
          files = response.result.entries || [];
          newCursor = response.result.cursor || null;
        }

        // Sort: directories first, then by name
        const sorted = [...files].sort((a, b) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });

        if (reset) {
          set({
            files: sorted,
            currentPath: targetPath,
            cursor: newCursor,
            hasMore: !!newCursor,
            isLoading: false,
            selectedFiles: []
          });
        } else {
          // Append to existing files
          const existingFiles = get().files;
          set({
            files: [...existingFiles, ...sorted],
            cursor: newCursor,
            hasMore: !!newCursor,
            isLoadingMore: false
          });
        }
      } else {
        // No disk or no access - just show empty list without error
        set({
          files: reset ? [] : get().files,
          currentPath: targetPath,
          cursor: null,
          hasMore: false,
          isLoading: false,
          isLoadingMore: false,
          error: null
        });
      }
    } catch {
      // Silently fail - show empty directory if no disk
      set({
        files: reset ? [] : get().files,
        currentPath: targetPath,
        cursor: null,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null
      });
    }
  },

  loadMore: async () => {
    const { hasMore, isLoadingMore, currentPath } = get();
    if (!hasMore || isLoadingMore) return;
    await get().listFiles(currentPath, false);
  },

  navigateTo: async (path: string) => {
    await get().listFiles(path);
  },

  navigateUp: async () => {
    const { currentPath } = get();
    if (currentPath === '/') return;

    try {
      // Decode base64 path to get the real path
      const decodedPath = decodeURIComponent(escape(atob(currentPath)));
      // Split by / and remove the last segment
      const parts = decodedPath.split('/').filter(Boolean);
      parts.pop();

      if (parts.length === 0) {
        // Back to root
        await get().listFiles('/');
      } else {
        // Re-encode the parent path
        const parentPath = '/' + parts.join('/');
        const encodedParentPath = btoa(unescape(encodeURIComponent(parentPath)));
        await get().listFiles(encodedParentPath);
      }
    } catch {
      // If decoding fails, try the old method or go to root
      await get().listFiles('/');
    }
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

    try {
      // src is base64 path, dst is just the new name (clear text)
      const response = await api.post(`${API_ROUTES.FS}/rename`, { src: oldPath, dst: newName });
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
  },

  // Share links
  fetchShareLinks: async () => {
    try {
      const response = await api.get<ShareLink[]>(`${API_ROUTES.FS}/share`);
      if (response.success && response.result) {
        set({ shareLinks: response.result });
      }
    } catch {
      // Silently fail
    }
  },

  createShareLink: async (path: string, expireDays?: number) => {
    try {
      // Calculate expiration timestamp (days from now)
      const expire = expireDays
        ? Math.floor(Date.now() / 1000) + (expireDays * 24 * 60 * 60)
        : 0; // 0 = no expiration

      const response = await api.post<ShareLink>(`${API_ROUTES.FS}/share`, { path, expire });
      if (response.success && response.result) {
        // Refresh share links list
        await get().fetchShareLinks();
        return response.result;
      }
      set({ error: response.error?.message || 'Erreur lors de la création du lien de partage' });
      return null;
    } catch {
      set({ error: 'Erreur lors de la création du lien de partage' });
      return null;
    }
  },

  deleteShareLink: async (token: string) => {
    try {
      const response = await api.delete(`${API_ROUTES.FS}/share/${encodeURIComponent(token)}`);
      if (response.success) {
        // Remove from local state immediately
        const { shareLinks } = get();
        set({ shareLinks: shareLinks.filter(link => link.token !== token) });
        return true;
      }
      set({ error: response.error?.message || 'Erreur lors de la suppression du lien' });
      return false;
    } catch {
      set({ error: 'Erreur lors de la suppression du lien' });
      return false;
    }
  }
}));